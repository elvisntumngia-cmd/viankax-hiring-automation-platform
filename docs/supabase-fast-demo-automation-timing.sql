-- Fast demo timing patch.
-- Makes currently queued automation jobs and email notifications ready now.

update automation_jobs
set
  scheduled_for = now(),
  updated_at = now(),
  last_error = null
where job_status = 'queued'
  and scheduled_for > now()
  and job_type in (
    'send_confirmation_sms',
    'send_confirmation_email',
    'send_ai_assessment',
    'evaluate_ai_assessment',
    'voice_interview_analysis',
    'send_scheduling_link'
  );

update notification_queue
set
  scheduled_for = now(),
  updated_at = now(),
  last_error = null
where notification_status = 'queued'
  and scheduled_for > now()
  and channel in ('email', 'sms');

