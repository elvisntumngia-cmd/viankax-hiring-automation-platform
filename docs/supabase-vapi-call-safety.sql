-- Vapi call safety cleanup.
-- Use this after deploying the idempotent Vapi runner.
-- Goal: one active Vapi call per applicant, no late-night surprise calls.

with call_window as (
  select
    extract(hour from now() at time zone 'America/New_York')::int as current_hour,
    case
      when extract(hour from now() at time zone 'America/New_York')::int < 9 then
        ((date_trunc('day', now() at time zone 'America/New_York') + interval '9 hours') at time zone 'America/New_York')
      when extract(hour from now() at time zone 'America/New_York')::int >= 20 then
        ((date_trunc('day', now() at time zone 'America/New_York') + interval '1 day 9 hours') at time zone 'America/New_York')
      else now()
    end as next_allowed_at
)
update automation_jobs
set
  job_status = 'completed',
  last_error = 'Skipped duplicate Vapi job because applicant already has a Vapi provider call.',
  updated_at = now()
where job_type = 'voice_interview_analysis'
  and job_status in ('blocked', 'queued', 'running', 'failed')
  and exists (
    select 1
    from voice_interviews
    where voice_interviews.applicant_id = automation_jobs.applicant_id
      and voice_interviews.provider = 'vapi'
      and voice_interviews.provider_call_id is not null
  );

update automation_jobs
set
  job_status = 'blocked',
  last_error = 'Waiting for Strong or Moderate AI screening recommendation before Vapi call.',
  updated_at = now()
where job_type = 'voice_interview_analysis'
  and job_status in ('queued', 'running', 'failed')
  and not exists (
    select 1
    from ai_recommendations
    where ai_recommendations.applicant_id = automation_jobs.applicant_id
      and ai_recommendations.recommendation in ('Strong Candidate', 'Moderate Candidate')
  );

with call_window as (
  select
    extract(hour from now() at time zone 'America/New_York')::int as current_hour,
    case
      when extract(hour from now() at time zone 'America/New_York')::int < 9 then
        ((date_trunc('day', now() at time zone 'America/New_York') + interval '9 hours') at time zone 'America/New_York')
      when extract(hour from now() at time zone 'America/New_York')::int >= 20 then
        ((date_trunc('day', now() at time zone 'America/New_York') + interval '1 day 9 hours') at time zone 'America/New_York')
      else now()
    end as next_allowed_at
)
update automation_jobs
set
  job_status = 'queued',
  scheduled_for = call_window.next_allowed_at,
  last_error = case
    when call_window.current_hour < 9 or call_window.current_hour >= 20 then
      'Voice call queued for next allowed calling window: 9 AM-8 PM America/New_York.'
    else null
  end,
  updated_at = now(),
  payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'provider', 'vapi',
    'mode', 'safe_wake_after_screening'
  )
from call_window
where automation_jobs.job_type = 'voice_interview_analysis'
  and automation_jobs.job_status in ('blocked', 'queued', 'failed')
  and exists (
    select 1
    from screening_answers
    where screening_answers.applicant_id = automation_jobs.applicant_id
      and screening_answers.category = 'ai_assessment'
  )
  and exists (
    select 1
    from ai_recommendations
    where ai_recommendations.applicant_id = automation_jobs.applicant_id
      and ai_recommendations.recommendation in ('Strong Candidate', 'Moderate Candidate')
  )
  and not exists (
    select 1
    from voice_interviews
    where voice_interviews.applicant_id = automation_jobs.applicant_id
      and voice_interviews.provider = 'vapi'
      and voice_interviews.provider_call_id is not null
  );
