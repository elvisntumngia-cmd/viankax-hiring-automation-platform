-- Wake voice interview jobs for applicants who already completed AI screening.
-- Run this if an applicant submitted the AI screening but no Vapi call started.

update automation_jobs
set
  job_status = 'queued',
  scheduled_for = now(),
  last_error = null,
  updated_at = now(),
  payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'provider', 'vapi',
    'mode', 'wake_after_ai_screening_completed'
  )
where job_type = 'voice_interview_analysis'
  and job_status in ('queued', 'failed')
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
  );
