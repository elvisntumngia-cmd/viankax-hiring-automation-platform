-- Wake qualified applicants whose AI screening completed but Vapi voice job stayed blocked.
-- Safe goals:
-- 1. Do not call applicants outside 9 AM-8 PM America/New_York.
-- 2. Do not create duplicate calls for applicants who already have a Vapi provider call.
-- 3. Wake Strong/Moderate/Qualified candidates and high-score candidates only.

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
),
qualified_applicants as (
  select distinct applicants.id
  from applicants
  left join ai_recommendations on ai_recommendations.applicant_id = applicants.id
  left join ai_screening_tasks on ai_screening_tasks.applicant_id = applicants.id
  left join candidate_scores on candidate_scores.applicant_id = applicants.id
  where exists (
    select 1
    from screening_answers
    where screening_answers.applicant_id = applicants.id
      and screening_answers.category = 'ai_assessment'
  )
  and not exists (
    select 1
    from voice_interviews
    where voice_interviews.applicant_id = applicants.id
      and voice_interviews.provider = 'vapi'
      and voice_interviews.provider_call_id is not null
  )
  and (
    ai_recommendations.recommendation in ('Strong Candidate', 'Moderate Candidate', 'Qualified')
    or ai_screening_tasks.recommendation in ('Strong Candidate', 'Moderate Candidate', 'Qualified')
    or candidate_scores.screening_score >= 72
    or candidate_scores.overall_candidate_score >= 72
  )
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
    'mode', 'wake_qualified_voice_jobs'
  )
from call_window, qualified_applicants
where automation_jobs.applicant_id = qualified_applicants.id
  and automation_jobs.job_type = 'voice_interview_analysis'
  and automation_jobs.job_status in ('blocked', 'queued', 'failed', 'running');

-- Show the current voice-job state for the newest applicants.
select
  applicants.full_name,
  applicants.email,
  applicants.phone,
  applicants.current_stage,
  ai_recommendations.recommendation as ai_recommendation,
  candidate_scores.screening_score,
  candidate_scores.overall_candidate_score,
  automation_jobs.job_status as voice_job_status,
  automation_jobs.scheduled_for as voice_job_scheduled_for,
  automation_jobs.last_error as voice_job_last_error,
  voice_interviews.provider_call_id,
  voice_interviews.status as voice_status
from applicants
left join ai_recommendations on ai_recommendations.applicant_id = applicants.id
left join candidate_scores on candidate_scores.applicant_id = applicants.id
left join automation_jobs
  on automation_jobs.applicant_id = applicants.id
  and automation_jobs.job_type = 'voice_interview_analysis'
left join voice_interviews
  on voice_interviews.applicant_id = applicants.id
where applicants.submitted_at > now() - interval '2 days'
order by applicants.submitted_at desc, automation_jobs.updated_at desc nulls last;
