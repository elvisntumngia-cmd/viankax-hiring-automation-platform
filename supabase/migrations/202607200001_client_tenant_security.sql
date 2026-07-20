-- Tenant security rebuild for the client-based ViankaX data model.
-- Apply only after these Edge Functions are deployed and tested:
-- - public-application-submit
-- - create-applicant-upload-url
-- - applicant-workflow

create extension if not exists "pgcrypto";

create table if not exists public.client_user_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'hiring_manager',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_user_memberships_role_check
    check (role in ('platform_admin', 'client_owner', 'client_admin', 'recruiter', 'hiring_manager', 'viewer')),
  constraint client_user_memberships_status_check
    check (status in ('active', 'invited', 'disabled'))
);

create unique index if not exists idx_client_user_memberships_unique_user_client
  on public.client_user_memberships(user_id, client_id);

create index if not exists idx_client_user_memberships_client_id
  on public.client_user_memberships(client_id);

create index if not exists idx_client_user_memberships_user_id
  on public.client_user_memberships(user_id);

alter table public.client_user_memberships enable row level security;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_user_memberships membership
    where membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'platform_admin'
  );
$$;

create or replace function public.current_user_belongs_to_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.client_user_memberships membership
      where membership.user_id = auth.uid()
        and membership.client_id = target_client_id
        and membership.status = 'active'
    );
$$;

create or replace function public.current_user_has_client_role(target_client_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.client_user_memberships membership
      where membership.user_id = auth.uid()
        and membership.client_id = target_client_id
        and membership.status = 'active'
        and membership.role = any(allowed_roles)
    );
$$;

drop policy if exists "Members can read own client memberships" on public.client_user_memberships;
create policy "Members can read own client memberships"
  on public.client_user_memberships for select
  using (user_id = auth.uid() or public.current_user_is_platform_admin());

drop policy if exists "Client admins can manage memberships" on public.client_user_memberships;
create policy "Client admins can manage memberships"
  on public.client_user_memberships for all
  using (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin']))
  with check (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin']));

-- Public applicant entry points stay readable.
drop policy if exists "Public can read jobs for demo" on public.jobs;
drop policy if exists "Public can read open jobs" on public.jobs;
drop policy if exists "Public can read active public jobs" on public.jobs;
create policy "Public can read active public jobs"
  on public.jobs for select
  using (status = 'open');

drop policy if exists "Public can read clients for demo" on public.clients;
drop policy if exists "Public can read active client names for jobs" on public.clients;
create policy "Public can read active client names for jobs"
  on public.clients for select
  using (status = 'active');

drop policy if exists "Public can read job sites for demo" on public.job_sites;
drop policy if exists "Public can read active job sites" on public.job_sites;
create policy "Public can read active job sites"
  on public.job_sites for select
  using (status = 'Active');

drop policy if exists "Public can read open shifts for demo" on public.open_shifts;
drop policy if exists "Public can read open shifts" on public.open_shifts;
create policy "Public can read open shifts"
  on public.open_shifts for select
  using (status = 'Open');

-- HR tenant access.
drop policy if exists "Tenant read clients" on public.clients;
create policy "Tenant read clients"
  on public.clients for select
  using (public.current_user_belongs_to_client(id));

drop policy if exists "Tenant manage clients" on public.clients;
create policy "Tenant manage clients"
  on public.clients for update
  using (public.current_user_has_client_role(id, array['client_owner', 'client_admin']))
  with check (public.current_user_has_client_role(id, array['client_owner', 'client_admin']));

drop policy if exists "Tenant manage jobs" on public.jobs;
create policy "Tenant manage jobs"
  on public.jobs for all
  using (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']))
  with check (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']));

drop policy if exists "Tenant manage job sites" on public.job_sites;
create policy "Tenant manage job sites"
  on public.job_sites for all
  using (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']))
  with check (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']));

drop policy if exists "Tenant manage open shifts" on public.open_shifts;
create policy "Tenant manage open shifts"
  on public.open_shifts for all
  using (
    public.current_user_has_client_role(
      (select site.client_id from public.job_sites site where site.id = open_shifts.site_id),
      array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']
    )
  )
  with check (
    public.current_user_has_client_role(
      (select site.client_id from public.job_sites site where site.id = open_shifts.site_id),
      array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']
    )
  );

-- Remove direct public applicant writes. Edge Functions use the service role and bypass RLS.
drop policy if exists "Public can read applicants for demo" on public.applicants;
drop policy if exists "Public can submit applicants" on public.applicants;
drop policy if exists "Public can update applicants for demo" on public.applicants;
drop policy if exists "Public can submit applications for active jobs" on public.applicants;
drop policy if exists "Tenant read applicants" on public.applicants;
create policy "Tenant read applicants"
  on public.applicants for select
  using (public.current_user_belongs_to_client(client_id));
drop policy if exists "Tenant manage applicants" on public.applicants;
create policy "Tenant manage applicants"
  on public.applicants for update
  using (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']))
  with check (public.current_user_has_client_role(client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager']));

-- Applicant-owned child records are readable to the same tenant.
drop policy if exists "Public can read document records for demo" on public.applicant_documents;
drop policy if exists "Public can create document records" on public.applicant_documents;
drop policy if exists "Tenant read applicant documents" on public.applicant_documents;
create policy "Tenant read applicant documents"
  on public.applicant_documents for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = applicant_documents.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read screening answers for demo" on public.screening_answers;
drop policy if exists "Public can submit screening answers" on public.screening_answers;
drop policy if exists "Tenant read screening answers" on public.screening_answers;
create policy "Tenant read screening answers"
  on public.screening_answers for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = screening_answers.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read candidate scores for demo" on public.candidate_scores;
drop policy if exists "Public can create candidate scores" on public.candidate_scores;
drop policy if exists "Public can update candidate scores for demo" on public.candidate_scores;
drop policy if exists "Tenant read candidate scores" on public.candidate_scores;
create policy "Tenant read candidate scores"
  on public.candidate_scores for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = candidate_scores.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read ai recommendations for demo" on public.ai_recommendations;
drop policy if exists "Public can create ai recommendations" on public.ai_recommendations;
drop policy if exists "Public can update ai recommendations for demo" on public.ai_recommendations;
drop policy if exists "Tenant read ai recommendations" on public.ai_recommendations;
create policy "Tenant read ai recommendations"
  on public.ai_recommendations for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = ai_recommendations.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

-- Workflow/automation/dashboard records. Writes are now server-side or HR-authenticated.
drop policy if exists "Public can read automation events for demo" on public.automation_events;
drop policy if exists "Public can create automation events" on public.automation_events;
drop policy if exists "Tenant read automation events" on public.automation_events;
create policy "Tenant read automation events"
  on public.automation_events for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = automation_events.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );
drop policy if exists "Tenant create automation events" on public.automation_events;
create policy "Tenant create automation events"
  on public.automation_events for insert
  with check (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = automation_events.applicant_id
        and public.current_user_has_client_role(applicant.client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager'])
    )
  );

drop policy if exists "Public can read workflow runs for demo" on public.workflow_runs;
drop policy if exists "Public can create workflow runs for demo" on public.workflow_runs;
drop policy if exists "Public can update workflow runs for demo" on public.workflow_runs;
drop policy if exists "Tenant read workflow runs" on public.workflow_runs;
create policy "Tenant read workflow runs"
  on public.workflow_runs for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = workflow_runs.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read automation jobs for demo" on public.automation_jobs;
drop policy if exists "Public can create automation jobs for demo" on public.automation_jobs;
drop policy if exists "Public can update automation jobs for demo" on public.automation_jobs;
drop policy if exists "Tenant read automation jobs" on public.automation_jobs;
create policy "Tenant read automation jobs"
  on public.automation_jobs for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = automation_jobs.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read notification queue for demo" on public.notification_queue;
drop policy if exists "Public can create notification queue for demo" on public.notification_queue;
drop policy if exists "Public can update notification queue for demo" on public.notification_queue;
drop policy if exists "Tenant read notification queue" on public.notification_queue;
create policy "Tenant read notification queue"
  on public.notification_queue for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = notification_queue.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read ai screening tasks for demo" on public.ai_screening_tasks;
drop policy if exists "Public can create ai screening tasks for demo" on public.ai_screening_tasks;
drop policy if exists "Public can update ai screening tasks" on public.ai_screening_tasks;
drop policy if exists "Public can update ai screening tasks for demo" on public.ai_screening_tasks;
drop policy if exists "Tenant read ai screening tasks" on public.ai_screening_tasks;
create policy "Tenant read ai screening tasks"
  on public.ai_screening_tasks for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = ai_screening_tasks.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read pipeline history for demo" on public.pipeline_stage_history;
drop policy if exists "Public can create pipeline history" on public.pipeline_stage_history;
drop policy if exists "Tenant read pipeline history" on public.pipeline_stage_history;
create policy "Tenant read pipeline history"
  on public.pipeline_stage_history for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = pipeline_stage_history.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );
drop policy if exists "Tenant create pipeline history" on public.pipeline_stage_history;
create policy "Tenant create pipeline history"
  on public.pipeline_stage_history for insert
  with check (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = pipeline_stage_history.applicant_id
        and public.current_user_has_client_role(applicant.client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager'])
    )
  );

drop policy if exists "Public can read voice interviews for demo" on public.voice_interviews;
drop policy if exists "Public can create voice interviews for demo" on public.voice_interviews;
drop policy if exists "Public can update voice interviews for demo" on public.voice_interviews;
drop policy if exists "Tenant read voice interviews" on public.voice_interviews;
create policy "Tenant read voice interviews"
  on public.voice_interviews for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = voice_interviews.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );

drop policy if exists "Public can read interview schedules for demo" on public.interview_schedules;
drop policy if exists "Public can create interview schedules for demo" on public.interview_schedules;
drop policy if exists "Public can update interview schedules for demo" on public.interview_schedules;
drop policy if exists "Tenant read interview schedules" on public.interview_schedules;
drop policy if exists "Tenant manage interview schedules" on public.interview_schedules;
create policy "Tenant read interview schedules"
  on public.interview_schedules for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = interview_schedules.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );
create policy "Tenant manage interview schedules"
  on public.interview_schedules for update
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = interview_schedules.applicant_id
        and public.current_user_has_client_role(applicant.client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager'])
    )
  )
  with check (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = interview_schedules.applicant_id
        and public.current_user_has_client_role(applicant.client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager'])
    )
  );

drop policy if exists "Public can read placement matches for demo" on public.placement_matches;
drop policy if exists "Public can create placement matches for demo" on public.placement_matches;
drop policy if exists "Public can update placement matches for demo" on public.placement_matches;
drop policy if exists "Tenant read placement matches" on public.placement_matches;
create policy "Tenant read placement matches"
  on public.placement_matches for select
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = placement_matches.applicant_id
        and public.current_user_belongs_to_client(applicant.client_id)
    )
  );
drop policy if exists "Tenant manage placement matches" on public.placement_matches;
create policy "Tenant manage placement matches"
  on public.placement_matches for update
  using (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = placement_matches.applicant_id
        and public.current_user_has_client_role(applicant.client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager'])
    )
  )
  with check (
    exists (
      select 1 from public.applicants applicant
      where applicant.id = placement_matches.applicant_id
        and public.current_user_has_client_role(applicant.client_id, array['client_owner', 'client_admin', 'recruiter', 'hiring_manager'])
    )
  );

drop policy if exists "Public can read calendar settings for demo" on public.calendar_settings;
drop policy if exists "Public can create calendar settings for demo" on public.calendar_settings;
drop policy if exists "Public can update calendar settings for demo" on public.calendar_settings;
drop policy if exists "Authenticated users can read calendar settings" on public.calendar_settings;
create policy "Authenticated users can read calendar settings"
  on public.calendar_settings for select
  using (auth.role() = 'authenticated');
drop policy if exists "Client admins can update calendar settings" on public.calendar_settings;
create policy "Client admins can update calendar settings"
  on public.calendar_settings for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Public can read calendar sync logs for demo" on public.calendar_sync_logs;
drop policy if exists "Public can create calendar sync logs for demo" on public.calendar_sync_logs;
drop policy if exists "Authenticated users can read calendar sync logs" on public.calendar_sync_logs;
create policy "Authenticated users can read calendar sync logs"
  on public.calendar_sync_logs for select
  using (auth.role() = 'authenticated');

-- Storage uploads now use create-applicant-upload-url signed upload tokens.
drop policy if exists "Public can upload resumes" on storage.objects;
drop policy if exists "Public can upload licenses" on storage.objects;
drop policy if exists "Public can upload government ids" on storage.objects;
drop policy if exists "Public can upload certifications" on storage.objects;
drop policy if exists "Public applicants can upload intake documents" on storage.objects;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
