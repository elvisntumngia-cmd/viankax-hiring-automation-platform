-- Requeue failed Vapi voice jobs after fixing provider payload/phone formatting.

update automation_jobs
set
  job_status = 'queued',
  scheduled_for = now(),
  last_error = null,
  updated_at = now(),
  payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'provider', 'vapi',
    'mode', 'retry_failed_vapi_voice_job'
  )
where job_type = 'voice_interview_analysis'
  and job_status = 'failed'
  and (
      last_error ilike '%serverUrl should not exist%'
      or last_error ilike '%E.164%'
      or last_error ilike '%valid phone number%'
      or last_error ilike '%Invalid Key%'
      or last_error ilike '%unique or exclusion constraint%'
      or last_error ilike '%provider_call_id%'
    );
