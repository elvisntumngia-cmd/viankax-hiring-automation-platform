with settings as (
  select
    provider,
    interviewer_email,
    interview_duration_minutes,
    buffer_minutes
  from calendar_settings
  where settings_key = 'default'
  limit 1
),
calendar_defaults as (
  select
    coalesce((select provider from settings), 'Internal calendar') as provider,
    coalesce((select interviewer_email from settings), 'hr@viankax.com') as interviewer_email,
    coalesce((select interview_duration_minutes from settings), 30) as interview_duration_minutes,
    coalesce((select buffer_minutes from settings), 15) as buffer_minutes
)
insert into interview_schedules (
  applicant_id,
  provider,
  scheduled_for,
  scheduling_url,
  interviewer_email,
  interview_duration_minutes,
  buffer_minutes,
  external_calendar_provider,
  sync_status,
  status
)
select
  applicants.id,
  case
    when lower(calendar_defaults.provider) like '%google%' then 'google_calendar'
    when lower(calendar_defaults.provider) like '%microsoft%' or lower(calendar_defaults.provider) like '%outlook%' then 'microsoft_outlook'
    else 'internal_calendar'
  end,
  now() + interval '3 days',
  'https://cal.com/viankax/final-interview-placeholder',
  calendar_defaults.interviewer_email,
  calendar_defaults.interview_duration_minutes,
  calendar_defaults.buffer_minutes,
  case
    when lower(calendar_defaults.provider) like '%google%' or lower(calendar_defaults.provider) like '%microsoft%' or lower(calendar_defaults.provider) like '%outlook%'
      then calendar_defaults.provider
    else null
  end,
  case
    when lower(calendar_defaults.provider) like '%google%' or lower(calendar_defaults.provider) like '%microsoft%' or lower(calendar_defaults.provider) like '%outlook%'
      then 'Ready to sync'
    else 'Not Connected'
  end,
  'Scheduled'
from applicants
cross join calendar_defaults
where (
    applicants.current_stage in ('Interview Scheduled', 'Ready for Review')
    or exists (
      select 1
      from placement_matches
      where placement_matches.applicant_id = applicants.id
    )
  )
  and not exists (
    select 1
    from interview_schedules
    where interview_schedules.applicant_id = applicants.id
  );

update applicants
set
  interview_status = 'Scheduled',
  updated_at = now()
where (
    current_stage in ('Interview Scheduled', 'Ready for Review')
    or exists (
      select 1
      from placement_matches
      where placement_matches.applicant_id = applicants.id
    )
  )
  and coalesce(interview_status, '') <> 'Scheduled';
