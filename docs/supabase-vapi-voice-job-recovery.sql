insert into automation_jobs (
  applicant_id,
  workflow_run_id,
  job_type,
  job_label,
  job_status,
  priority,
  scheduled_for,
  payload
)
select
  applicants.id,
  latest_workflow.id,
  'voice_interview_analysis',
  'Create Vapi voice interview',
  'queued',
  6,
  now(),
  jsonb_build_object(
    'provider', 'vapi',
    'mode', 'manual_vapi_voice_job_recovery'
  )
from applicants
left join lateral (
  select workflow_runs.id
  from workflow_runs
  where workflow_runs.applicant_id = applicants.id
  order by workflow_runs.created_at desc
  limit 1
) latest_workflow on true
where applicants.current_stage in (
  'Assessment Completed',
  'License Verified',
  'Voice Interview Complete',
  'Ready for Review'
)
and not exists (
  select 1
  from automation_jobs existing_jobs
  where existing_jobs.applicant_id = applicants.id
    and existing_jobs.job_type = 'voice_interview_analysis'
    and existing_jobs.job_status in ('queued', 'running')
)
and not exists (
  select 1
  from voice_interviews
  where voice_interviews.applicant_id = applicants.id
    and voice_interviews.provider = 'vapi'
    and voice_interviews.provider_call_id is not null
);

