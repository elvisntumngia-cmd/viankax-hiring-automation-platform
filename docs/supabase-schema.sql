create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  site_name text not null,
  client_customer_name text,
  location text not null,
  address text,
  city text,
  state text,
  required_license_type text not null default 'SO',
  required_traits text[] not null default '{}',
  preferred_traits text[] not null default '{}',
  site_notes text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists open_shifts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references job_sites(id) on delete cascade,
  shift_title text not null,
  shift_type text not null,
  employment_type text not null,
  days_needed text[] not null default '{}',
  start_time text,
  end_time text,
  open_positions integer not null default 1,
  required_license_type text not null default 'SO',
  minimum_experience text,
  required_traits text[] not null default '{}',
  preferred_traits text[] not null default '{}',
  urgency text not null default 'Normal',
  status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  site_id uuid references job_sites(id) on delete set null,
  open_shift_id uuid references open_shifts(id) on delete set null,
  title text not null,
  location text not null,
  pay_range text,
  shift_options text[] not null default '{}',
  requirements text[] not null default '{}',
  license_requirements text[] not null default '{}',
  responsibilities text[] not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table jobs add column if not exists site_id uuid references job_sites(id) on delete set null;
alter table jobs add column if not exists open_shift_id uuid references open_shifts(id) on delete set null;
alter table jobs add column if not exists public_apply_slug text;
alter table jobs add column if not exists public_apply_url text;

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  site_id uuid references job_sites(id) on delete set null,
  open_shift_id uuid references open_shifts(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  location text,
  current_stage text not null default 'New Applicant',
  status text not null default 'In Progress',
  knockout_result text not null default 'Pending',
  license_status text not null default 'Pending',
  interview_status text not null default 'Not Started',
  final_decision text not null default 'Review',
  notes text,
  source text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applicant_documents (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  document_type text not null,
  file_name text,
  storage_bucket text,
  storage_path text,
  status text not null default 'Pending',
  uploaded_at timestamptz default now()
);

create table if not exists screening_answers (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  question text not null,
  answer text,
  category text not null default 'application',
  created_at timestamptz not null default now()
);

create table if not exists candidate_scores (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  resume_score integer check (resume_score between 0 and 100),
  eligibility_score integer check (eligibility_score between 0 and 100),
  screening_score integer check (screening_score between 0 and 100),
  voice_interview_score integer check (voice_interview_score between 0 and 100),
  overall_candidate_score integer check (overall_candidate_score between 0 and 100),
  scoring_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  recommendation text not null default 'Pending AI Review',
  confidence integer check (confidence between 0 and 100),
  summary text,
  risk_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table applicants add column if not exists site_id uuid references job_sites(id) on delete set null;
alter table applicants add column if not exists open_shift_id uuid references open_shifts(id) on delete set null;

create table if not exists ai_screening_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_family text not null,
  prompt text not null,
  questions jsonb not null default '[]',
  scoring_rubric jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_screening_tasks (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  template_id uuid references ai_screening_templates(id) on delete set null,
  task_status text not null default 'queued',
  prompt_snapshot text,
  candidate_context jsonb not null default '{}',
  ai_summary text,
  role_fit_score integer check (role_fit_score between 0 and 100),
  professionalism_score integer check (professionalism_score between 0 and 100),
  communication_score integer check (communication_score between 0 and 100),
  availability_score integer check (availability_score between 0 and 100),
  risk_flags text[] not null default '{}',
  recommendation text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete cascade,
  event_type text not null,
  event_status text not null default 'pending',
  event_label text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete cascade,
  workflow_name text not null,
  run_status text not null default 'queued',
  current_step text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_jobs (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete cascade,
  workflow_run_id uuid references workflow_runs(id) on delete cascade,
  job_type text not null,
  job_label text not null,
  job_status text not null default 'queued',
  priority integer not null default 5,
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notification_queue (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete cascade,
  automation_job_id uuid references automation_jobs(id) on delete set null,
  channel text not null,
  recipient text not null,
  subject text,
  message text not null,
  notification_status text not null default 'queued',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pipeline_stage_history (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by text not null default 'automation',
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists voice_interviews (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  provider text,
  recording_url text,
  transcript text,
  score integer check (score between 0 and 100),
  recommendation text,
  status text not null default 'Not Started',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists interview_schedules (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  provider text,
  scheduled_for timestamptz,
  scheduling_url text,
  external_calendar_provider text,
  external_event_id text,
  sync_status text not null default 'Not Connected',
  sync_error text,
  synced_at timestamptz,
  status text not null default 'Not Scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calendar_settings (
  id uuid primary key default gen_random_uuid(),
  settings_key text not null default 'default',
  provider text not null default 'Internal calendar',
  interviewer_email text not null default 'hr@viankax.com',
  interview_duration_minutes integer not null default 30,
  buffer_minutes integer not null default 15,
  scheduling_window text not null default '3 business days after voice interview',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists placement_matches (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  site_id uuid references job_sites(id) on delete set null,
  open_shift_id uuid references open_shifts(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  match_score integer check (match_score between 0 and 100),
  recommendation_reason text,
  strengths text[] not null default '{}',
  concerns text[] not null default '{}',
  match_status text not null default 'Recommended',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_client_id on jobs(client_id);
create index if not exists idx_job_sites_client_id on job_sites(client_id);
create index if not exists idx_job_sites_status on job_sites(status);
create index if not exists idx_open_shifts_site_id on open_shifts(site_id);
create index if not exists idx_open_shifts_status on open_shifts(status);
create unique index if not exists idx_calendar_settings_key on calendar_settings(settings_key);
create index if not exists idx_jobs_site_id on jobs(site_id);
create index if not exists idx_jobs_open_shift_id on jobs(open_shift_id);
create index if not exists idx_applicants_job_id on applicants(job_id);
create index if not exists idx_applicants_site_id on applicants(site_id);
create index if not exists idx_applicants_open_shift_id on applicants(open_shift_id);
create index if not exists idx_applicants_current_stage on applicants(current_stage);
create index if not exists idx_applicant_documents_applicant_id on applicant_documents(applicant_id);
create index if not exists idx_candidate_scores_applicant_id on candidate_scores(applicant_id);
create unique index if not exists idx_candidate_scores_unique_applicant on candidate_scores(applicant_id);
create unique index if not exists idx_ai_recommendations_unique_applicant on ai_recommendations(applicant_id);
create index if not exists idx_ai_screening_templates_role_family on ai_screening_templates(role_family);
create index if not exists idx_ai_screening_tasks_applicant_id on ai_screening_tasks(applicant_id);
create index if not exists idx_ai_screening_tasks_status on ai_screening_tasks(task_status);
create index if not exists idx_automation_events_applicant_id on automation_events(applicant_id);
create index if not exists idx_workflow_runs_applicant_id on workflow_runs(applicant_id);
create index if not exists idx_workflow_runs_status on workflow_runs(run_status);
create index if not exists idx_automation_jobs_applicant_id on automation_jobs(applicant_id);
create index if not exists idx_automation_jobs_status on automation_jobs(job_status);
create index if not exists idx_notification_queue_applicant_id on notification_queue(applicant_id);
create index if not exists idx_notification_queue_status on notification_queue(notification_status);
create index if not exists idx_pipeline_stage_history_applicant_id on pipeline_stage_history(applicant_id);
create index if not exists idx_placement_matches_applicant_id on placement_matches(applicant_id);
create index if not exists idx_placement_matches_open_shift_id on placement_matches(open_shift_id);

alter table clients enable row level security;
alter table job_sites enable row level security;
alter table open_shifts enable row level security;
alter table jobs enable row level security;
alter table applicants enable row level security;
alter table applicant_documents enable row level security;
alter table screening_answers enable row level security;
alter table candidate_scores enable row level security;
alter table ai_recommendations enable row level security;
alter table ai_screening_templates enable row level security;
alter table ai_screening_tasks enable row level security;
alter table automation_events enable row level security;
alter table workflow_runs enable row level security;
alter table automation_jobs enable row level security;
alter table notification_queue enable row level security;
alter table pipeline_stage_history enable row level security;
alter table voice_interviews enable row level security;
alter table interview_schedules enable row level security;
alter table calendar_settings enable row level security;
alter table placement_matches enable row level security;

drop policy if exists "Public can read open jobs" on jobs;
drop policy if exists "Public can read jobs for demo" on jobs;
create policy "Public can read jobs for demo"
  on jobs for select
  using (true);

drop policy if exists "Public can create jobs for demo" on jobs;
create policy "Public can create jobs for demo"
  on jobs for insert
  with check (true);

drop policy if exists "Public can update jobs for demo" on jobs;
create policy "Public can update jobs for demo"
  on jobs for update
  using (true)
  with check (true);

drop policy if exists "Public can read clients for demo" on clients;
create policy "Public can read clients for demo"
  on clients for select
  using (true);

drop policy if exists "Public can read job sites for demo" on job_sites;
create policy "Public can read job sites for demo"
  on job_sites for select
  using (true);

drop policy if exists "Public can create job sites for demo" on job_sites;
create policy "Public can create job sites for demo"
  on job_sites for insert
  with check (true);

drop policy if exists "Public can update job sites for demo" on job_sites;
create policy "Public can update job sites for demo"
  on job_sites for update
  using (true)
  with check (true);

drop policy if exists "Public can read open shifts for demo" on open_shifts;
create policy "Public can read open shifts for demo"
  on open_shifts for select
  using (true);

drop policy if exists "Public can create open shifts for demo" on open_shifts;
create policy "Public can create open shifts for demo"
  on open_shifts for insert
  with check (true);

drop policy if exists "Public can update open shifts for demo" on open_shifts;
create policy "Public can update open shifts for demo"
  on open_shifts for update
  using (true)
  with check (true);

drop policy if exists "Public can read applicants for demo" on applicants;
create policy "Public can read applicants for demo"
  on applicants for select
  using (true);

drop policy if exists "Public can submit applicants" on applicants;
create policy "Public can submit applicants"
  on applicants for insert
  with check (true);

drop policy if exists "Public can update applicants for demo" on applicants;
create policy "Public can update applicants for demo"
  on applicants for update
  using (true)
  with check (true);

drop policy if exists "Public can read screening answers for demo" on screening_answers;
create policy "Public can read screening answers for demo"
  on screening_answers for select
  using (true);

drop policy if exists "Public can submit screening answers" on screening_answers;
create policy "Public can submit screening answers"
  on screening_answers for insert
  with check (true);

drop policy if exists "Public can read document records for demo" on applicant_documents;
create policy "Public can read document records for demo"
  on applicant_documents for select
  using (true);

drop policy if exists "Public can create document records" on applicant_documents;
create policy "Public can create document records"
  on applicant_documents for insert
  with check (true);

drop policy if exists "Public can read candidate scores for demo" on candidate_scores;
create policy "Public can read candidate scores for demo"
  on candidate_scores for select
  using (true);

drop policy if exists "Public can create candidate scores" on candidate_scores;
create policy "Public can create candidate scores"
  on candidate_scores for insert
  with check (true);

drop policy if exists "Public can update candidate scores for demo" on candidate_scores;
create policy "Public can update candidate scores for demo"
  on candidate_scores for update
  using (true)
  with check (true);

drop policy if exists "Public can read ai recommendations for demo" on ai_recommendations;
create policy "Public can read ai recommendations for demo"
  on ai_recommendations for select
  using (true);

drop policy if exists "Public can create ai recommendations" on ai_recommendations;
create policy "Public can create ai recommendations"
  on ai_recommendations for insert
  with check (true);

drop policy if exists "Public can update ai recommendations for demo" on ai_recommendations;
create policy "Public can update ai recommendations for demo"
  on ai_recommendations for update
  using (true)
  with check (true);

drop policy if exists "Public can read ai screening templates for demo" on ai_screening_templates;
create policy "Public can read ai screening templates for demo"
  on ai_screening_templates for select
  using (true);

drop policy if exists "Public can create ai screening templates for demo" on ai_screening_templates;
create policy "Public can create ai screening templates for demo"
  on ai_screening_templates for insert
  with check (true);

drop policy if exists "Public can update ai screening templates for demo" on ai_screening_templates;
create policy "Public can update ai screening templates for demo"
  on ai_screening_templates for update
  using (true)
  with check (true);

drop policy if exists "Public can read ai screening tasks for demo" on ai_screening_tasks;
create policy "Public can read ai screening tasks for demo"
  on ai_screening_tasks for select
  using (true);

drop policy if exists "Public can create ai screening tasks for demo" on ai_screening_tasks;
create policy "Public can create ai screening tasks for demo"
  on ai_screening_tasks for insert
  with check (true);

drop policy if exists "Public can update ai screening tasks for demo" on ai_screening_tasks;
create policy "Public can update ai screening tasks for demo"
  on ai_screening_tasks for update
  using (true)
  with check (true);

drop policy if exists "Public can read automation events for demo" on automation_events;
create policy "Public can read automation events for demo"
  on automation_events for select
  using (true);

drop policy if exists "Public can create automation events" on automation_events;
create policy "Public can create automation events"
  on automation_events for insert
  with check (true);

drop policy if exists "Public can read workflow runs for demo" on workflow_runs;
create policy "Public can read workflow runs for demo"
  on workflow_runs for select
  using (true);

drop policy if exists "Public can create workflow runs for demo" on workflow_runs;
create policy "Public can create workflow runs for demo"
  on workflow_runs for insert
  with check (true);

drop policy if exists "Public can update workflow runs for demo" on workflow_runs;
create policy "Public can update workflow runs for demo"
  on workflow_runs for update
  using (true)
  with check (true);

drop policy if exists "Public can read automation jobs for demo" on automation_jobs;
create policy "Public can read automation jobs for demo"
  on automation_jobs for select
  using (true);

drop policy if exists "Public can create automation jobs for demo" on automation_jobs;
create policy "Public can create automation jobs for demo"
  on automation_jobs for insert
  with check (true);

drop policy if exists "Public can update automation jobs for demo" on automation_jobs;
create policy "Public can update automation jobs for demo"
  on automation_jobs for update
  using (true)
  with check (true);

drop policy if exists "Public can read notification queue for demo" on notification_queue;
create policy "Public can read notification queue for demo"
  on notification_queue for select
  using (true);

drop policy if exists "Public can create notification queue for demo" on notification_queue;
create policy "Public can create notification queue for demo"
  on notification_queue for insert
  with check (true);

drop policy if exists "Public can update notification queue for demo" on notification_queue;
create policy "Public can update notification queue for demo"
  on notification_queue for update
  using (true)
  with check (true);

drop policy if exists "Public can read pipeline history for demo" on pipeline_stage_history;
create policy "Public can read pipeline history for demo"
  on pipeline_stage_history for select
  using (true);

drop policy if exists "Public can create pipeline history" on pipeline_stage_history;
create policy "Public can create pipeline history"
  on pipeline_stage_history for insert
  with check (true);

drop policy if exists "Public can read voice interviews for demo" on voice_interviews;
create policy "Public can read voice interviews for demo"
  on voice_interviews for select
  using (true);

drop policy if exists "Public can create voice interviews for demo" on voice_interviews;
create policy "Public can create voice interviews for demo"
  on voice_interviews for insert
  with check (true);

drop policy if exists "Public can update voice interviews for demo" on voice_interviews;
create policy "Public can update voice interviews for demo"
  on voice_interviews for update
  using (true)
  with check (true);

drop policy if exists "Public can read interview schedules for demo" on interview_schedules;
create policy "Public can read interview schedules for demo"
  on interview_schedules for select
  using (true);

drop policy if exists "Public can create interview schedules for demo" on interview_schedules;
create policy "Public can create interview schedules for demo"
  on interview_schedules for insert
  with check (true);

drop policy if exists "Public can update interview schedules for demo" on interview_schedules;
create policy "Public can update interview schedules for demo"
  on interview_schedules for update
  using (true)
  with check (true);

drop policy if exists "Public can read calendar settings for demo" on calendar_settings;
create policy "Public can read calendar settings for demo"
  on calendar_settings for select
  using (true);

drop policy if exists "Public can create calendar settings for demo" on calendar_settings;
create policy "Public can create calendar settings for demo"
  on calendar_settings for insert
  with check (true);

drop policy if exists "Public can update calendar settings for demo" on calendar_settings;
create policy "Public can update calendar settings for demo"
  on calendar_settings for update
  using (true)
  with check (true);

drop policy if exists "Public can read placement matches for demo" on placement_matches;
create policy "Public can read placement matches for demo"
  on placement_matches for select
  using (true);

drop policy if exists "Public can create placement matches for demo" on placement_matches;
create policy "Public can create placement matches for demo"
  on placement_matches for insert
  with check (true);

drop policy if exists "Public can update placement matches for demo" on placement_matches;
create policy "Public can update placement matches for demo"
  on placement_matches for update
  using (true)
  with check (true);
