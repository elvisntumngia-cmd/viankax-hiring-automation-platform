-- Disable the Vapi call window for demo testing.
-- This releases qualified voice jobs immediately while keeping duplicate-call protection.

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
  job_status = 'queued',
  scheduled_for = now(),
  last_error = null,
  updated_at = now(),
  payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'provider', 'vapi',
    'mode', 'call_window_disabled'
  )
where job_type = 'voice_interview_analysis'
  and job_status in ('blocked', 'queued', 'failed', 'running')
  and exists (
    select 1
    from screening_answers
    where screening_answers.applicant_id = automation_jobs.applicant_id
      and screening_answers.category = 'ai_assessment'
  )
  and (
    exists (
      select 1
      from ai_recommendations
      where ai_recommendations.applicant_id = automation_jobs.applicant_id
        and ai_recommendations.recommendation in ('Strong Candidate', 'Moderate Candidate', 'Qualified')
    )
    or exists (
      select 1
      from candidate_scores
      where candidate_scores.applicant_id = automation_jobs.applicant_id
        and coalesce(candidate_scores.screening_score, candidate_scores.overall_candidate_score, 0) >= 72
    )
  )
  and not exists (
    select 1
    from voice_interviews
    where voice_interviews.applicant_id = automation_jobs.applicant_id
      and voice_interviews.provider = 'vapi'
      and voice_interviews.provider_call_id is not null
  );

select
  applicants.full_name,
  applicants.email,
  applicants.phone,
  ai_recommendations.recommendation,
  candidate_scores.screening_score,
  automation_jobs.job_status,
  automation_jobs.scheduled_for,
  automation_jobs.last_error
from automation_jobs
join applicants on applicants.id = automation_jobs.applicant_id
left join ai_recommendations on ai_recommendations.applicant_id = applicants.id
left join candidate_scores on candidate_scores.applicant_id = applicants.id
where automation_jobs.job_type = 'voice_interview_analysis'
order by automation_jobs.updated_at desc nulls last
limit 20;
