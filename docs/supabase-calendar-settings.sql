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
