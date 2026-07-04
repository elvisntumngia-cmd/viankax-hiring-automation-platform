insert into interview_schedules (
  applicant_id,
  provider,
  scheduled_for,
  scheduling_url,
  status
)
select
  applicants.id,
  'calendar_placeholder',
  now() + interval '3 days',
  'https://cal.com/viankax/final-interview-placeholder',
  'Scheduled'
from applicants
where (
    applicants.current_stage in ('Interview Scheduled', 'Ready for Review')
    or exists (
      select 1
      from placement_matches
      where placement_matches.applicant_id = applicants.id
    )
  )
  and not exists (
    select 1
    from interview_schedules
    where interview_schedules.applicant_id = applicants.id
  );

update applicants
set
  interview_status = 'Scheduled',
  updated_at = now()
where (
    current_stage in ('Interview Scheduled', 'Ready for Review')
    or exists (
      select 1
      from placement_matches
      where placement_matches.applicant_id = applicants.id
    )
  )
  and coalesce(interview_status, '') <> 'Scheduled';
