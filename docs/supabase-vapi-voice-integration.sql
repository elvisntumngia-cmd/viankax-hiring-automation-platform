alter table voice_interviews add column if not exists provider_call_id text;
alter table voice_interviews add column if not exists interview_url text;
alter table voice_interviews add column if not exists raw_provider_payload jsonb not null default '{}';
alter table voice_interviews add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_voice_interviews_provider_call_id
  on voice_interviews(provider_call_id)
  where provider_call_id is not null;

