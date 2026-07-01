create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
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

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
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

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete cascade,
  event_type text not null,
  event_status text not null default 'pending',
  event_label text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
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
  status text not null default 'Not Scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_client_id on jobs(client_id);
create index if not exists idx_applicants_job_id on applicants(job_id);
create index if not exists idx_applicants_current_stage on applicants(current_stage);
create index if not exists idx_applicant_documents_applicant_id on applicant_documents(applicant_id);
create index if not exists idx_candidate_scores_applicant_id on candidate_scores(applicant_id);
create unique index if not exists idx_candidate_scores_unique_applicant on candidate_scores(applicant_id);
create unique index if not exists idx_ai_recommendations_unique_applicant on ai_recommendations(applicant_id);
create index if not exists idx_automation_events_applicant_id on automation_events(applicant_id);
create index if not exists idx_pipeline_stage_history_applicant_id on pipeline_stage_history(applicant_id);

alter table clients enable row level security;
alter table jobs enable row level security;
alter table applicants enable row level security;
alter table applicant_documents enable row level security;
alter table screening_answers enable row level security;
alter table candidate_scores enable row level security;
alter table ai_recommendations enable row level security;
alter table automation_events enable row level security;
alter table pipeline_stage_history enable row level security;
alter table voice_interviews enable row level security;
alter table interview_schedules enable row level security;

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

drop policy if exists "Public can read ai recommendations for demo" on ai_recommendations;
create policy "Public can read ai recommendations for demo"
  on ai_recommendations for select
  using (true);

drop policy if exists "Public can create ai recommendations" on ai_recommendations;
create policy "Public can create ai recommendations"
  on ai_recommendations for insert
  with check (true);

drop policy if exists "Public can read automation events for demo" on automation_events;
create policy "Public can read automation events for demo"
  on automation_events for select
  using (true);

drop policy if exists "Public can create automation events" on automation_events;
create policy "Public can create automation events"
  on automation_events for insert
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

drop policy if exists "Public can read interview schedules for demo" on interview_schedules;
create policy "Public can read interview schedules for demo"
  on interview_schedules for select
  using (true);
