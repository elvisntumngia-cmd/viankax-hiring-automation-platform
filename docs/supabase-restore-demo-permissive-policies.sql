-- Restore last-known-good demo behavior after strict tenant RLS broke public intake.
-- This is NOT the final production security model.
-- Use it to get the live demo working again, then rebuild tenant security behind
-- service-role Edge Functions in a separate checkpoint.

-- Public jobs/applicant portal reads.
drop policy if exists "Public can read active public jobs" on public.jobs;
drop policy if exists "Tenant manage jobs" on public.jobs;
drop policy if exists "Public can read jobs for demo" on public.jobs;
create policy "Public can read jobs for demo"
  on public.jobs for select
  using (true);

drop policy if exists "Public can read active client names for jobs" on public.clients;
drop policy if exists "Tenant read clients" on public.clients;
drop policy if exists "Tenant manage clients" on public.clients;
drop policy if exists "Public can read clients for demo" on public.clients;
create policy "Public can read clients for demo"
  on public.clients for select
  using (true);

drop policy if exists "Tenant read job sites" on public.job_sites;
drop policy if exists "Tenant manage job sites" on public.job_sites;
drop policy if exists "Public can read job sites for demo" on public.job_sites;
create policy "Public can read job sites for demo"
  on public.job_sites for select
  using (true);

drop policy if exists "Tenant read open shifts" on public.open_shifts;
drop policy if exists "Tenant manage open shifts" on public.open_shifts;
drop policy if exists "Public can read open shifts for demo" on public.open_shifts;
create policy "Public can read open shifts for demo"
  on public.open_shifts for select
  using (true);

-- Applicant intake and dashboard demo reads.
drop policy if exists "Public can submit applications for active jobs" on public.applicants;
drop policy if exists "Tenant read applicants" on public.applicants;
drop policy if exists "Tenant manage applicants" on public.applicants;
drop policy if exists "Public can read applicants for demo" on public.applicants;
create policy "Public can read applicants for demo"
  on public.applicants for select
  using (true);
drop policy if exists "Public can submit applicants" on public.applicants;
create policy "Public can submit applicants"
  on public.applicants for insert
  with check (true);
drop policy if exists "Public can update applicants for demo" on public.applicants;
create policy "Public can update applicants for demo"
  on public.applicants for update
  using (true)
  with check (true);

drop policy if exists "Public intake can create applicant documents" on public.applicant_documents;
drop policy if exists "Tenant read applicant documents" on public.applicant_documents;
drop policy if exists "Tenant manage applicant documents" on public.applicant_documents;
drop policy if exists "Public can read document records for demo" on public.applicant_documents;
create policy "Public can read document records for demo"
  on public.applicant_documents for select
  using (true);
drop policy if exists "Public can create document records" on public.applicant_documents;
create policy "Public can create document records"
  on public.applicant_documents for insert
  with check (true);

drop policy if exists "Public intake can create screening answers" on public.screening_answers;
drop policy if exists "Tenant read screening answers" on public.screening_answers;
drop policy if exists "Public can read screening answers for demo" on public.screening_answers;
create policy "Public can read screening answers for demo"
  on public.screening_answers for select
  using (true);
drop policy if exists "Public can submit screening answers" on public.screening_answers;
create policy "Public can submit screening answers"
  on public.screening_answers for insert
  with check (true);

drop policy if exists "Public intake can create candidate scores" on public.candidate_scores;
drop policy if exists "Tenant read candidate scores" on public.candidate_scores;
drop policy if exists "Public can read candidate scores for demo" on public.candidate_scores;
create policy "Public can read candidate scores for demo"
  on public.candidate_scores for select
  using (true);
drop policy if exists "Public can create candidate scores" on public.candidate_scores;
create policy "Public can create candidate scores"
  on public.candidate_scores for insert
  with check (true);
drop policy if exists "Public can update candidate scores for demo" on public.candidate_scores;
create policy "Public can update candidate scores for demo"
  on public.candidate_scores for update
  using (true)
  with check (true);

drop policy if exists "Public intake can create ai recommendations" on public.ai_recommendations;
drop policy if exists "Tenant read ai recommendations" on public.ai_recommendations;
drop policy if exists "Public can read ai recommendations for demo" on public.ai_recommendations;
create policy "Public can read ai recommendations for demo"
  on public.ai_recommendations for select
  using (true);
drop policy if exists "Public can create ai recommendations" on public.ai_recommendations;
create policy "Public can create ai recommendations"
  on public.ai_recommendations for insert
  with check (true);
drop policy if exists "Public can update ai recommendations for demo" on public.ai_recommendations;
create policy "Public can update ai recommendations for demo"
  on public.ai_recommendations for update
  using (true)
  with check (true);

drop policy if exists "Public intake can create ai screening tasks" on public.ai_screening_tasks;
drop policy if exists "Tenant read ai screening tasks" on public.ai_screening_tasks;
drop policy if exists "Public can read ai screening tasks for demo" on public.ai_screening_tasks;
create policy "Public can read ai screening tasks for demo"
  on public.ai_screening_tasks for select
  using (true);
drop policy if exists "Public can create ai screening tasks for demo" on public.ai_screening_tasks;
create policy "Public can create ai screening tasks for demo"
  on public.ai_screening_tasks for insert
  with check (true);
drop policy if exists "Public can update ai screening tasks for demo" on public.ai_screening_tasks;
create policy "Public can update ai screening tasks for demo"
  on public.ai_screening_tasks for update
  using (true)
  with check (true);

drop policy if exists "Public intake can create automation events" on public.automation_events;
drop policy if exists "Tenant read automation events" on public.automation_events;
drop policy if exists "Public can read automation events for demo" on public.automation_events;
create policy "Public can read automation events for demo"
  on public.automation_events for select
  using (true);
drop policy if exists "Public can create automation events" on public.automation_events;
create policy "Public can create automation events"
  on public.automation_events for insert
  with check (true);

drop policy if exists "Public intake can create workflow runs" on public.workflow_runs;
drop policy if exists "Tenant read workflow runs" on public.workflow_runs;
drop policy if exists "Public can read workflow runs for demo" on public.workflow_runs;
create policy "Public can read workflow runs for demo"
  on public.workflow_runs for select
  using (true);
drop policy if exists "Public can create workflow runs for demo" on public.workflow_runs;
create policy "Public can create workflow runs for demo"
  on public.workflow_runs for insert
  with check (true);
drop policy if exists "Public can update workflow runs for demo" on public.workflow_runs;
create policy "Public can update workflow runs for demo"
  on public.workflow_runs for update
  using (true)
  with check (true);

drop policy if exists "Public intake can create automation jobs" on public.automation_jobs;
drop policy if exists "Tenant read automation jobs" on public.automation_jobs;
drop policy if exists "Public can read automation jobs for demo" on public.automation_jobs;
create policy "Public can read automation jobs for demo"
  on public.automation_jobs for select
  using (true);
drop policy if exists "Public can create automation jobs for demo" on public.automation_jobs;
create policy "Public can create automation jobs for demo"
  on public.automation_jobs for insert
  with check (true);
drop policy if exists "Public can update automation jobs for demo" on public.automation_jobs;
create policy "Public can update automation jobs for demo"
  on public.automation_jobs for update
  using (true)
  with check (true);

drop policy if exists "Public intake can create notifications" on public.notification_queue;
drop policy if exists "Tenant read notification queue" on public.notification_queue;
drop policy if exists "Public can read notification queue for demo" on public.notification_queue;
create policy "Public can read notification queue for demo"
  on public.notification_queue for select
  using (true);
drop policy if exists "Public can create notification queue for demo" on public.notification_queue;
create policy "Public can create notification queue for demo"
  on public.notification_queue for insert
  with check (true);
drop policy if exists "Public can update notification queue for demo" on public.notification_queue;
create policy "Public can update notification queue for demo"
  on public.notification_queue for update
  using (true)
  with check (true);

drop policy if exists "Tenant read pipeline history" on public.pipeline_stage_history;
drop policy if exists "Public can read pipeline history for demo" on public.pipeline_stage_history;
create policy "Public can read pipeline history for demo"
  on public.pipeline_stage_history for select
  using (true);
drop policy if exists "Public can create pipeline history" on public.pipeline_stage_history;
create policy "Public can create pipeline history"
  on public.pipeline_stage_history for insert
  with check (true);

drop policy if exists "Tenant read voice interviews" on public.voice_interviews;
drop policy if exists "Public can read voice interviews for demo" on public.voice_interviews;
create policy "Public can read voice interviews for demo"
  on public.voice_interviews for select
  using (true);
drop policy if exists "Public can create voice interviews for demo" on public.voice_interviews;
create policy "Public can create voice interviews for demo"
  on public.voice_interviews for insert
  with check (true);
drop policy if exists "Public can update voice interviews for demo" on public.voice_interviews;
create policy "Public can update voice interviews for demo"
  on public.voice_interviews for update
  using (true)
  with check (true);

drop policy if exists "Tenant read interview schedules" on public.interview_schedules;
drop policy if exists "Tenant manage interview schedules" on public.interview_schedules;
drop policy if exists "Public can read interview schedules for demo" on public.interview_schedules;
create policy "Public can read interview schedules for demo"
  on public.interview_schedules for select
  using (true);
drop policy if exists "Public can create interview schedules for demo" on public.interview_schedules;
create policy "Public can create interview schedules for demo"
  on public.interview_schedules for insert
  with check (true);
drop policy if exists "Public can update interview schedules for demo" on public.interview_schedules;
create policy "Public can update interview schedules for demo"
  on public.interview_schedules for update
  using (true)
  with check (true);

-- Restore storage upload demo policies.
drop policy if exists "Organization users can upload applicant documents" on storage.objects;
drop policy if exists "Organization users can read applicant documents" on storage.objects;
drop policy if exists "Organization users can update applicant documents" on storage.objects;
drop policy if exists "Organization admins can delete applicant documents" on storage.objects;
drop policy if exists "Public applicants can upload intake documents" on storage.objects;

drop policy if exists "Public can upload resumes" on storage.objects;
create policy "Public can upload resumes"
  on storage.objects for insert
  with check (bucket_id = 'resumes');
drop policy if exists "Public can upload licenses" on storage.objects;
create policy "Public can upload licenses"
  on storage.objects for insert
  with check (bucket_id = 'licenses');
drop policy if exists "Public can upload government ids" on storage.objects;
create policy "Public can upload government ids"
  on storage.objects for insert
  with check (bucket_id = 'government-ids');
drop policy if exists "Public can upload certifications" on storage.objects;
create policy "Public can upload certifications"
  on storage.objects for insert
  with check (bucket_id = 'certifications');

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname in ('public', 'storage')
  and (
    policyname ilike '%demo%'
    or policyname in (
      'Public can submit applicants',
      'Public can create automation jobs for demo',
      'Public can create notification queue for demo'
    )
  )
order by schemaname, tablename, policyname;
