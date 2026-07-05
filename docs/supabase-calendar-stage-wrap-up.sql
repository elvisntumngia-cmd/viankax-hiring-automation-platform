create table if not exists calendar_settings (
  id uuid primary key default gen_random_uuid(),
  settings_key text not null default 'default',
  provider text not null default 'Internal calendar',
  interviewer_email text not null default 'hr@viankax.com',
  interview_duration_minutes integer not null default 30,
  buffer_minutes integer not null default 15,
  scheduling_window text not null default '3 business days after voice interview',
  business_hours_start text not null default '09:00',
  business_hours_end text not null default '17:00',
  allow_weekends boolean not null default false,
  max_interviews_per_day integer not null default 6,
  google_connection_status text not null default 'Not connected',
  microsoft_connection_status text not null default 'Not connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calendar_settings
  add column if not exists business_hours_start text not null default '09:00',
  add column if not exists business_hours_end text not null default '17:00',
  add column if not exists allow_weekends boolean not null default false,
  add column if not exists max_interviews_per_day integer not null default 6,
  add column if not exists google_connection_status text not null default 'Not connected',
  add column if not exists microsoft_connection_status text not null default 'Not connected';

create unique index if not exists idx_calendar_settings_key
  on calendar_settings(settings_key);

alter table calendar_settings enable row level security;

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

insert into calendar_settings (
  settings_key,
  provider,
  interviewer_email,
  interview_duration_minutes,
  buffer_minutes,
  scheduling_window
)
values (
  'default',
  'Internal calendar',
  'hr@viankax.com',
  30,
  15,
  '3 business days after voice interview'
)
on conflict (settings_key) do nothing;

alter table interview_schedules
  add column if not exists interviewer_email text,
  add column if not exists interview_duration_minutes integer not null default 30,
  add column if not exists buffer_minutes integer not null default 15,
  add column if not exists external_calendar_provider text,
  add column if not exists external_event_id text,
  add column if not exists sync_status text not null default 'Not Connected',
  add column if not exists sync_error text,
  add column if not exists synced_at timestamptz;

create table if not exists calendar_sync_logs (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references applicants(id) on delete set null,
  interview_schedule_id uuid references interview_schedules(id) on delete set null,
  provider text not null default 'internal_calendar',
  action text not null,
  sync_status text not null default 'Logged',
  provider_event_id text,
  message text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists calendar_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_account_email text,
  access_token text,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  connection_status text not null default 'Not connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_calendar_connections_provider
  on calendar_connections(provider);

alter table calendar_connections enable row level security;

alter table calendar_sync_logs enable row level security;

drop policy if exists "Public can read calendar sync logs for demo" on calendar_sync_logs;
create policy "Public can read calendar sync logs for demo"
  on calendar_sync_logs for select
  using (true);

drop policy if exists "Public can create calendar sync logs for demo" on calendar_sync_logs;
create policy "Public can create calendar sync logs for demo"
  on calendar_sync_logs for insert
  with check (true);

create index if not exists idx_interview_schedules_scheduled_for
  on interview_schedules(scheduled_for);

create index if not exists idx_interview_schedules_external_event_id
  on interview_schedules(external_event_id);

update interview_schedules as s
set
  interviewer_email = coalesce(s.interviewer_email, cs.interviewer_email),
  interview_duration_minutes = coalesce(s.interview_duration_minutes, cs.interview_duration_minutes),
  buffer_minutes = coalesce(s.buffer_minutes, cs.buffer_minutes),
  sync_status = coalesce(s.sync_status, 'Not Connected'),
  updated_at = now()
from calendar_settings as cs
where cs.settings_key = 'default';
