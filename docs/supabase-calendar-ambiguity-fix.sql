update interview_schedules as s
set
  interviewer_email = coalesce(s.interviewer_email, cs.interviewer_email),
  interview_duration_minutes = coalesce(s.interview_duration_minutes, cs.interview_duration_minutes),
  buffer_minutes = coalesce(s.buffer_minutes, cs.buffer_minutes),
  sync_status = coalesce(s.sync_status, 'Not Connected'),
  updated_at = now()
from calendar_settings as cs
where cs.settings_key = 'default';
