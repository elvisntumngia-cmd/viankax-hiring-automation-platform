-- Recover missing AI screening invite notifications for recent applicants.
-- Run this if confirmation email sent but no AI screening email exists.

insert into notification_queue (
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
  applicants.id,
  ai_jobs.id,
  'email',
  applicants.email,
  'Complete your ViankaX screening assessment',
  'Please complete your AI screening assessment so the hiring team can continue reviewing your application: http://localhost:5173/screening/' || applicants.id,
  'queued',
  now(),
  jsonb_build_object(
    'template', 'ai_assessment_invite',
    'assessmentUrl', 'http://localhost:5173/screening/' || applicants.id,
    'recovered', true
  )
from applicants
left join lateral (
  select automation_jobs.id
  from automation_jobs
  where automation_jobs.applicant_id = applicants.id
    and automation_jobs.job_type = 'send_ai_assessment'
  order by automation_jobs.created_at desc
  limit 1
) ai_jobs on true
where applicants.knockout_result <> 'Failed'
  and applicants.email is not null
  and not exists (
    select 1
    from notification_queue existing_notifications
    where existing_notifications.applicant_id = applicants.id
      and (
        existing_notifications.subject = 'Complete your ViankaX screening assessment'
        or existing_notifications.metadata->>'template' = 'ai_assessment_invite'
      )
  )
  and not exists (
    select 1
    from screening_answers
    where screening_answers.applicant_id = applicants.id
      and screening_answers.category = 'ai_assessment'
  );

update notification_queue
set
  scheduled_for = now(),
  updated_at = now(),
  last_error = null
where notification_status = 'queued'
  and (
    subject = 'Complete your ViankaX screening assessment'
    or metadata->>'template' = 'ai_assessment_invite'
  );

