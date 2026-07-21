-- Recover the screening-complete email/voice-trigger step for applicants who
-- completed AI screening but did not receive the voice interview email.
--
-- Optional: narrow the email below before running.

with target_applicants as (
  select distinct
    applicants.id,
    applicants.email
  from public.applicants
  join public.screening_answers
    on screening_answers.applicant_id = applicants.id
   and screening_answers.category = 'ai_assessment'
  left join public.notification_queue existing_voice_email
    on existing_voice_email.applicant_id = applicants.id
   and existing_voice_email.channel = 'email'
   and existing_voice_email.metadata @> jsonb_build_object('template', 'screening_complete_voice_trigger')
  where applicants.email is not null
    and applicants.submitted_at > now() - interval '2 days'
    -- Uncomment and set this if you want to recover one test applicant only:
    -- and lower(applicants.email) = lower('candidate@example.com')
    and existing_voice_email.id is null
),
latest_workflow as (
  select distinct on (workflow_runs.applicant_id)
    workflow_runs.applicant_id,
    workflow_runs.id as workflow_run_id
  from public.workflow_runs
  join target_applicants on target_applicants.id = workflow_runs.applicant_id
  order by workflow_runs.applicant_id, workflow_runs.created_at desc
),
upsert_jobs as (
  insert into public.automation_jobs (
    applicant_id,
    workflow_run_id,
    job_type,
    job_label,
    job_status,
    priority,
    scheduled_for,
    last_error,
    payload
  )
  select
    target_applicants.id,
    latest_workflow.workflow_run_id,
    'send_screening_complete_email',
    'Send screening complete email',
    'queued',
    1,
    now(),
    null,
    jsonb_build_object(
      'channel', 'email',
      'template', 'screening_complete_voice_trigger',
      'mode', 'recovered_screening_complete_email'
    )
  from target_applicants
  left join latest_workflow on latest_workflow.applicant_id = target_applicants.id
  where not exists (
    select 1
    from public.automation_jobs existing_job
    where existing_job.applicant_id = target_applicants.id
      and existing_job.job_type = 'send_screening_complete_email'
      and existing_job.job_status in ('queued', 'running', 'completed')
  )
  returning id, applicant_id
),
wake_existing_jobs as (
  update public.automation_jobs
  set
    job_status = 'queued',
    priority = 1,
    scheduled_for = now(),
    last_error = null,
    updated_at = now()
  from target_applicants
  where automation_jobs.applicant_id = target_applicants.id
    and automation_jobs.job_type = 'send_screening_complete_email'
    and automation_jobs.job_status in ('blocked', 'failed', 'queued', 'running')
  returning automation_jobs.id, automation_jobs.applicant_id
),
ready_jobs as (
  select * from upsert_jobs
  union
  select * from wake_existing_jobs
)
insert into public.notification_queue (
  applicant_id,
  automation_job_id,
  channel,
  recipient,
  subject,
  message,
  notification_status,
  scheduled_for,
  metadata
)
select
  target_applicants.id,
  ready_jobs.id,
  'email',
  target_applicants.email,
  'Your ViankaX screening is complete',
  'Your AI screening is complete. Please trigger your voice interview when you are ready: https://viankax-hiring-automation-platform.vercel.app/voice/' || target_applicants.id,
  'queued',
  now(),
  jsonb_build_object(
    'template', 'screening_complete_voice_trigger',
    'voiceUrl', 'https://viankax-hiring-automation-platform.vercel.app/voice/' || target_applicants.id,
    'mode', 'recovered_screening_complete_email'
  )
from target_applicants
join ready_jobs on ready_jobs.applicant_id = target_applicants.id
where not exists (
  select 1
  from public.notification_queue existing_notification
  where existing_notification.applicant_id = target_applicants.id
    and existing_notification.channel = 'email'
    and existing_notification.metadata @> jsonb_build_object('template', 'screening_complete_voice_trigger')
);

select
  applicants.full_name,
  applicants.email,
  automation_jobs.job_status,
  automation_jobs.scheduled_for,
  notification_queue.notification_status,
  notification_queue.subject,
  notification_queue.metadata ->> 'voiceUrl' as voice_url
from public.applicants
left join public.automation_jobs
  on automation_jobs.applicant_id = applicants.id
 and automation_jobs.job_type = 'send_screening_complete_email'
left join public.notification_queue
  on notification_queue.applicant_id = applicants.id
 and notification_queue.metadata @> jsonb_build_object('template', 'screening_complete_voice_trigger')
where applicants.submitted_at > now() - interval '2 days'
order by applicants.submitted_at desc;
