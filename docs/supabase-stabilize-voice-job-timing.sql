-- Stabilize voice interview timing.
-- Prevent old deferred voice/scheduling jobs from firing hours later.
-- Then wake only recommended applicants who already completed AI screening.

update automation_jobs
set
  job_status = 'blocked',
  last_error = 'Waiting for AI screening recommendation.',
  updated_at = now()
where job_type = 'voice_interview_analysis'
  and job_status = 'queued'
  and not exists (
    select 1
    from ai_recommendations
    where ai_recommendations.applicant_id = automation_jobs.applicant_id
      and ai_recommendations.recommendation in ('Strong Candidate', 'Moderate Candidate')
  );

update automation_jobs
set
  job_status = 'blocked',
  last_error = 'Waiting for voice interview completion.',
  updated_at = now()
where job_type = 'send_scheduling_link'
  and job_status = 'queued'
  and not exists (
    select 1
    from voice_interviews
    where voice_interviews.applicant_id = automation_jobs.applicant_id
      and voice_interviews.status = 'Complete'
  );

update automation_jobs
set
  job_status = 'queued',
  scheduled_for = now(),
  last_error = null,
  updated_at = now(),
  payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'provider', 'vapi',
    'mode', 'wake_after_recommended_ai_screening'
  )
where job_type = 'voice_interview_analysis'
  and job_status in ('blocked', 'queued', 'failed')
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
