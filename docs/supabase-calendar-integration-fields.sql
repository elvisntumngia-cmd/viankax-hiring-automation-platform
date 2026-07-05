alter table interview_schedules
  add column if not exists interviewer_email text,
  add column if not exists interview_duration_minutes integer not null default 30,
  add column if not exists buffer_minutes integer not null default 15,
  add column if not exists external_calendar_provider text,
  add column if not exists external_event_id text,
  add column if not exists sync_status text not null default 'Not Connected',
  add column if not exists sync_error text,
  add column if not exists synced_at timestamptz;

create index if not exists idx_interview_schedules_scheduled_for
  on interview_schedules(scheduled_for);

create index if not exists idx_interview_schedules_external_event_id
  on interview_schedules(external_event_id);
