-- Diagnose Vapi call creation vs webhook completion.
-- Run in Supabase SQL Editor after a test call.

select
  applicants.full_name,
  applicants.email,
  applicants.phone,
  applicants.current_stage,
  applicants.interview_status,
  ai_recommendations.recommendation as ai_recommendation,
  candidate_scores.screening_score,
  candidate_scores.voice_interview_score,
  voice_interviews.provider,
  voice_interviews.provider_call_id,
  voice_interviews.status as voice_status,
  voice_interviews.score as voice_score,
  case when voice_interviews.transcript is null then 'No transcript' else left(voice_interviews.transcript, 160) end as voice_notes_preview,
  voice_interviews.recording_url,
  voice_interviews.completed_at,
  automation_jobs.job_status as voice_job_status,
  automation_jobs.last_error as voice_job_error,
  automation_jobs.updated_at as voice_job_updated_at
from applicants
left join ai_recommendations on ai_recommendations.applicant_id = applicants.id
left join candidate_scores on candidate_scores.applicant_id = applicants.id
left join voice_interviews on voice_interviews.applicant_id = applicants.id
left join automation_jobs
  on automation_jobs.applicant_id = applicants.id
  and automation_jobs.job_type = 'voice_interview_analysis'
where applicants.submitted_at > now() - interval '3 days'
order by applicants.submitted_at desc, voice_interviews.updated_at desc nulls last;

select
  applicant_id,
  event_type,
  event_status,
  event_label,
  metadata,
  created_at
from automation_events
where event_type in (
  'voice_interview_analyzed',
  'voice_interview_already_sent',
  'vapi_voice_interview_completed',
  'scheduling_link_sent'
)
order by created_at desc
limit 30;
