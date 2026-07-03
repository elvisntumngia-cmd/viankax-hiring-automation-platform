with ranked_matches as (
  select
    applicants.id as applicant_id,
    applicants.job_id,
    open_shifts.site_id,
    open_shifts.id as open_shift_id,
    least(
      98,
      greatest(
        50,
        coalesce(candidate_scores.overall_candidate_score, candidate_scores.screening_score, 75)
        + case when applicants.open_shift_id = open_shifts.id then 10 else 0 end
        + case when lower(coalesce(open_shifts.required_license_type, '')) in ('so', 'unarmed') then 5 else -5 end
      )
    )::integer as match_score,
    row_number() over (
      partition by applicants.id
      order by
        case when applicants.open_shift_id = open_shifts.id then 0 else 1 end,
        coalesce(candidate_scores.overall_candidate_score, candidate_scores.screening_score, 75) desc,
        open_shifts.open_positions desc
    ) as match_rank
  from applicants
  cross join open_shifts
  left join candidate_scores on candidate_scores.applicant_id = applicants.id
  where open_shifts.status = 'Open'
    and applicants.current_stage in ('Interview Scheduled', 'Ready for Review', 'Voice Interview Complete', 'Assessment Completed')
    and not exists (
      select 1
      from placement_matches
      where placement_matches.applicant_id = applicants.id
    )
)
insert into placement_matches (
  applicant_id,
  site_id,
  open_shift_id,
  job_id,
  match_score,
  recommendation_reason,
  strengths,
  concerns,
  match_status
)
select
  ranked_matches.applicant_id,
  ranked_matches.site_id,
  ranked_matches.open_shift_id,
  ranked_matches.job_id,
  ranked_matches.match_score,
  'Backfilled placement recommendation based on candidate score, linked shift, and open shift availability.',
  array['Candidate completed automation workflow', 'Open shift available'],
  case
    when ranked_matches.match_score >= 80 then array[]::text[]
    else array['HR should review license, availability, and site fit before assignment']
  end,
  'Recommended'
from ranked_matches
where ranked_matches.match_rank <= 4;

update applicants
set
  current_stage = 'Ready for Review',
  updated_at = now()
where current_stage in ('Interview Scheduled', 'Voice Interview Complete')
  and exists (
    select 1
    from placement_matches
    where placement_matches.applicant_id = applicants.id
  );
