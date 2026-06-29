insert into clients (id, name, industry, status)
values
  ('11111111-1111-1111-1111-111111111111', 'MetroShield Security', 'Private Security', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'CareBridge Home Health', 'Home Healthcare', 'active')
on conflict (id) do update set
  name = excluded.name,
  industry = excluded.industry,
  status = excluded.status,
  updated_at = now();

insert into jobs (
  id,
  client_id,
  title,
  location,
  pay_range,
  shift_options,
  requirements,
  license_requirements,
  responsibilities,
  status
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Security Officer',
    'Atlanta, GA',
    '$18 - $22/hr',
    array['Evening', 'Overnight', 'Weekend'],
    array[
      'Authorized to work in the United States',
      'Reliable transportation to assigned posts',
      'Able to pass background screening',
      'Comfortable standing for long periods'
    ],
    array['Georgia security guard card preferred'],
    array[
      'Monitor access points and assigned areas',
      'Follow post orders and incident procedures',
      'Write clear incident reports when needed',
      'Communicate professionally with visitors and staff'
    ],
    'open'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Armed Security Officer',
    'Charlotte, NC',
    '$24 - $30/hr',
    array['Day', 'Evening', 'Rotating'],
    array[
      'Current armed security license',
      'Documented security or military experience',
      'Background check consent',
      'Professional communication under pressure'
    ],
    array['Valid armed guard license required'],
    array[
      'Maintain visible professional site presence',
      'Respond to incidents using site protocol',
      'Complete daily activity and incident reports',
      'Coordinate with supervisors and emergency contacts'
    ],
    'open'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222222',
    'Home Health Aide',
    'Tampa, FL',
    '$17 - $21/hr',
    array['Day', 'Weekend', 'Flexible'],
    array[
      'Reliable transportation',
      'Patient and professional communication',
      'Available for weekend shifts',
      'Able to complete onboarding documents quickly'
    ],
    array['HHA certificate preferred'],
    array[
      'Support clients with daily care routines',
      'Document visit notes accurately',
      'Communicate changes to care coordinators',
      'Arrive reliably for assigned shifts'
    ],
    'open'
  )
on conflict (id) do update set
  title = excluded.title,
  location = excluded.location,
  pay_range = excluded.pay_range,
  shift_options = excluded.shift_options,
  requirements = excluded.requirements,
  license_requirements = excluded.license_requirements,
  responsibilities = excluded.responsibilities,
  status = excluded.status,
  updated_at = now();

insert into applicants (
  id,
  client_id,
  job_id,
  full_name,
  email,
  phone,
  location,
  current_stage,
  status,
  knockout_result,
  license_status,
  interview_status,
  final_decision,
  notes,
  source
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'John Carter',
    'john.carter@example.com',
    '(404) 555-0184',
    'Atlanta, GA',
    'New Applicant',
    'In Progress',
    'Passed',
    'Needs Review',
    'Not Started',
    'Review',
    'Good candidate for unarmed evening posts.',
    'Demo seed'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Melissa Grant',
    'melissa.grant@example.com',
    '(678) 555-0119',
    'Atlanta, GA',
    'Assessment Completed',
    'Qualified',
    'Passed',
    'Verified',
    'Ready for Voice Interview',
    'Advance',
    'High-priority candidate for commercial client site.',
    'Demo seed'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'David Brooks',
    'david.brooks@example.com',
    '(704) 555-0144',
    'Charlotte, NC',
    'License Pending',
    'Pending',
    'Needs Review',
    'Pending Upload',
    'Blocked',
    'Hold',
    'Do not advance until license is uploaded.',
    'Demo seed'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Angela Morris',
    'angela.morris@example.com',
    '(813) 555-0197',
    'Tampa, FL',
    'Interview Scheduled',
    'Qualified',
    'Passed',
    'Verified',
    'Scheduled',
    'Advance',
    'Strong candidate. Prepare offer if interview goes well.',
    'Demo seed'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Kevin Hughes',
    'kevin.hughes@example.com',
    '(470) 555-0162',
    'Atlanta, GA',
    'Rejected',
    'Rejected',
    'Failed',
    'Not Applicable',
    'Closed',
    'Reject',
    'Automatically marked not qualified for V1 demo flow.',
    'Demo seed'
  )
on conflict (id) do update set
  current_stage = excluded.current_stage,
  status = excluded.status,
  knockout_result = excluded.knockout_result,
  license_status = excluded.license_status,
  interview_status = excluded.interview_status,
  final_decision = excluded.final_decision,
  notes = excluded.notes,
  updated_at = now();

insert into candidate_scores (
  applicant_id,
  resume_score,
  eligibility_score,
  screening_score,
  voice_interview_score,
  overall_candidate_score
)
values
  ('10000000-0000-0000-0000-000000000001', 68, 100, 72, null, 76),
  ('10000000-0000-0000-0000-000000000002', 86, 100, 88, null, 89),
  ('10000000-0000-0000-0000-000000000003', 84, 92, 81, null, 82),
  ('10000000-0000-0000-0000-000000000004', 94, 100, 92, 91, 93),
  ('10000000-0000-0000-0000-000000000005', 35, 20, 42, null, 32)
on conflict (applicant_id) do update set
  resume_score = excluded.resume_score,
  eligibility_score = excluded.eligibility_score,
  screening_score = excluded.screening_score,
  voice_interview_score = excluded.voice_interview_score,
  overall_candidate_score = excluded.overall_candidate_score,
  updated_at = now();

insert into ai_recommendations (applicant_id, recommendation, confidence, summary, risk_flags)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'Needs Review',
    76,
    'Candidate passes basic eligibility and has useful entry-level site experience. License review and resume scoring should be completed before advancing.',
    array['License review required']
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Strong Candidate',
    91,
    'Candidate has three years of commercial security experience, verified documentation, reliable availability, and strong written screening responses.',
    array[]::text[]
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Compliance Hold',
    82,
    'Candidate appears qualified for armed posts, but license documentation is missing. Automation should request upload before voice interview or scheduling.',
    array['Missing license upload']
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Strong Candidate',
    94,
    'Candidate has five years of care experience, verified documentation, reliable transportation, weekend availability, and strong voice interview performance.',
    array[]::text[]
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Do Not Advance',
    96,
    'Candidate failed required knockout criteria because transportation is unavailable and background check consent was declined.',
    array['No reliable transportation', 'Background check declined']
  )
on conflict (applicant_id) do update set
  recommendation = excluded.recommendation,
  confidence = excluded.confidence,
  summary = excluded.summary,
  risk_flags = excluded.risk_flags,
  updated_at = now();
