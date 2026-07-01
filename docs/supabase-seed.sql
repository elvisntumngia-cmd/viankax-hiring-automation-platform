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

insert into ai_screening_templates (id, name, role_family, prompt, questions, scoring_rubric, status)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Security Candidate Screening V1',
    'security',
    'Evaluate the candidate for reliability, professionalism, communication, availability, security experience, and compliance readiness. Return structured scores and risk flags.',
    '[
      "Why are you interested in this role?",
      "Describe your security experience.",
      "How do you handle difficult situations with the public?",
      "Are you comfortable with incident reporting and post orders?",
      "How reliable is your availability for assigned shifts?"
    ]'::jsonb,
    '{
      "roleFitScore":"Experience, role alignment, shift fit",
      "professionalismScore":"Tone, judgment, workplace readiness",
      "communicationScore":"Clarity, public interaction, reporting readiness",
      "availabilityScore":"Schedule fit and reliability"
    }'::jsonb,
    'active'
  )
on conflict (id) do update set
  name = excluded.name,
  role_family = excluded.role_family,
  prompt = excluded.prompt,
  questions = excluded.questions,
  scoring_rubric = excluded.scoring_rubric,
  status = excluded.status,
  updated_at = now();

delete from ai_screening_tasks
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into ai_screening_tasks (
  applicant_id,
  template_id,
  task_status,
  prompt_snapshot,
  candidate_context,
  ai_summary,
  role_fit_score,
  professionalism_score,
  communication_score,
  availability_score,
  risk_flags,
  recommendation,
  completed_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'queued',
    'Evaluate candidate for security role readiness.',
    '{"experience":"Entry-level event security and access control","availability":"Evening and weekend interest"}'::jsonb,
    null,
    null,
    null,
    null,
    null,
    array[]::text[],
    null,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'completed',
    'Evaluate candidate for security role readiness.',
    '{"experience":"Three years commercial property security","availability":"Consistent overnight shifts"}'::jsonb,
    'AI screening indicates strong role fit, professional communication, reliable schedule fit, and clear comfort with public interaction.',
    91,
    93,
    88,
    90,
    array[]::text[],
    'Strong Candidate',
    now() - interval '1 hour'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'completed',
    'Evaluate candidate for armed security role readiness.',
    '{"experience":"Armed site security and patrol background","availability":"Steady hours requested","compliance":"License upload missing"}'::jsonb,
    'Candidate appears experienced and professional, but compliance is blocked until license documentation is uploaded.',
    86,
    84,
    80,
    78,
    array['Missing license upload'],
    'Compliance Hold',
    now() - interval '2 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    'completed',
    'Evaluate candidate for care operations readiness.',
    '{"experience":"Five years HHA experience","availability":"Weekend availability","transportation":"Reliable car"}'::jsonb,
    'Candidate shows strong reliability, clear communication, and strong availability for client care scheduling.',
    94,
    92,
    90,
    95,
    array[]::text[],
    'Strong Candidate',
    now() - interval '4 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000001',
    'blocked',
    'Evaluate candidate only if knockout criteria pass.',
    '{"transportation":"No reliable transportation","backgroundCheck":"Declined","availability":"Cannot work weekends or nights"}'::jsonb,
    'AI screening did not proceed because knockout criteria failed.',
    20,
    35,
    40,
    15,
    array['No reliable transportation', 'Background check declined', 'Limited availability'],
    'Do Not Advance',
    now() - interval '23 hours'
  );

delete from applicant_documents
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into applicant_documents (applicant_id, document_type, file_name, storage_bucket, storage_path, status)
values
  ('10000000-0000-0000-0000-000000000001', 'resume', 'john-carter-resume.pdf', 'resumes', 'john-carter/resume.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000001', 'license', null, 'licenses', null, 'Pending'),
  ('10000000-0000-0000-0000-000000000001', 'government_id', 'john-carter-id.png', 'government-ids', 'john-carter/id.png', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000002', 'resume', 'melissa-grant-resume.pdf', 'resumes', 'melissa-grant/resume.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000002', 'license', 'melissa-grant-guard-card.pdf', 'licenses', 'melissa-grant/license.pdf', 'Verified'),
  ('10000000-0000-0000-0000-000000000002', 'government_id', 'melissa-grant-id.png', 'government-ids', 'melissa-grant/id.png', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000003', 'resume', 'david-brooks-resume.pdf', 'resumes', 'david-brooks/resume.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000003', 'license', null, 'licenses', null, 'Missing'),
  ('10000000-0000-0000-0000-000000000003', 'government_id', 'david-brooks-id.png', 'government-ids', 'david-brooks/id.png', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000003', 'firearms', 'david-brooks-firearms.pdf', 'certifications', 'david-brooks/firearms.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000004', 'resume', 'angela-morris-resume.pdf', 'resumes', 'angela-morris/resume.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000004', 'license', 'angela-morris-hha.pdf', 'licenses', 'angela-morris/license.pdf', 'Verified'),
  ('10000000-0000-0000-0000-000000000004', 'government_id', 'angela-morris-id.png', 'government-ids', 'angela-morris/id.png', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000004', 'cpr', 'angela-morris-cpr.pdf', 'certifications', 'angela-morris/cpr.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000004', 'first_aid', 'angela-morris-first-aid.pdf', 'certifications', 'angela-morris/first-aid.pdf', 'Uploaded'),
  ('10000000-0000-0000-0000-000000000005', 'resume', null, 'resumes', null, 'Not Uploaded'),
  ('10000000-0000-0000-0000-000000000005', 'license', null, 'licenses', null, 'Not Uploaded'),
  ('10000000-0000-0000-0000-000000000005', 'government_id', null, 'government-ids', null, 'Not Uploaded');

delete from screening_answers
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into screening_answers (applicant_id, question, answer, category)
values
  ('10000000-0000-0000-0000-000000000001', 'Why interested?', 'Looking for a stable security role with growth opportunities.', 'application'),
  ('10000000-0000-0000-0000-000000000001', 'Experience', 'Worked event security and front desk access control for 1 year.', 'application'),
  ('10000000-0000-0000-0000-000000000001', 'Standing long periods', 'Yes, comfortable with long standing posts.', 'application'),
  ('10000000-0000-0000-0000-000000000002', 'Why interested?', 'Wants a long-term security role with consistent overnight shifts.', 'application'),
  ('10000000-0000-0000-0000-000000000002', 'Experience', 'Three years commercial property and lobby security.', 'application'),
  ('10000000-0000-0000-0000-000000000002', 'Public interaction', 'Comfortable de-escalating visitor and tenant issues.', 'application'),
  ('10000000-0000-0000-0000-000000000003', 'Why interested?', 'Seeking armed security position with steady hours.', 'application'),
  ('10000000-0000-0000-0000-000000000003', 'Experience', 'Former patrol officer and two years armed site security.', 'application'),
  ('10000000-0000-0000-0000-000000000003', 'Incident reporting', 'Comfortable writing reports and escalating properly.', 'application'),
  ('10000000-0000-0000-0000-000000000004', 'Why interested?', 'Enjoys supporting clients in home care settings.', 'application'),
  ('10000000-0000-0000-0000-000000000004', 'Experience', 'Five years HHA experience with weekend availability.', 'application'),
  ('10000000-0000-0000-0000-000000000004', 'Reliability', 'Has reliable car and flexible shift coverage.', 'application'),
  ('10000000-0000-0000-0000-000000000005', 'Transportation', 'No reliable transportation.', 'application'),
  ('10000000-0000-0000-0000-000000000005', 'Background check', 'Did not consent.', 'application'),
  ('10000000-0000-0000-0000-000000000005', 'Availability', 'Cannot work weekends or nights.', 'application');

delete from automation_events
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into automation_events (applicant_id, event_type, event_status, event_label, metadata)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'application_submitted',
    'complete',
    'Application Submitted',
    '{"description":"Candidate entered the pipeline from the applicant portal."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'resume_screening',
    'current',
    'Resume Screening',
    '{"description":"Resume parsing and role-fit scoring are pending automation review."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'application_submitted',
    'complete',
    'Application Submitted',
    '{"description":"Candidate entered the pipeline from the applicant portal."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'ai_screening_completed',
    'complete',
    'AI Screening Completed',
    '{"description":"AI screening assessment returned strong role-fit signals."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'license_verification',
    'current',
    'License Verification',
    '{"description":"License is verified; compliance review is being finalized."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'application_submitted',
    'complete',
    'Application Submitted',
    '{"description":"Candidate entered the pipeline from the applicant portal."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'license_verification',
    'current',
    'License Verification',
    '{"description":"License upload is missing and blocks advancement."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'application_submitted',
    'complete',
    'Application Submitted',
    '{"description":"Candidate entered the pipeline from the applicant portal."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'voice_interview_complete',
    'complete',
    'Voice Interview Complete',
    '{"description":"Voice interview is complete with strong communication score."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'interview_scheduled',
    'current',
    'Interview Scheduled',
    '{"description":"Hiring manager interview is scheduled."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'application_submitted',
    'complete',
    'Application Submitted',
    '{"description":"Candidate entered the pipeline from the applicant portal."}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'knockout_failed',
    'complete',
    'Knockout Screening Failed',
    '{"description":"Required criteria failed, so downstream automation was not triggered."}'::jsonb
  );

delete from notification_queue
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

delete from automation_jobs
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

delete from workflow_runs
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into workflow_runs (id, applicant_id, workflow_name, run_status, current_step, started_at, completed_at, metadata)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'candidate-intake-v1',
    'running',
    'resume_screening',
    now() - interval '42 minutes',
    null,
    '{"source":"Demo seed","nextAction":"Run resume screening and AI assessment"}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'candidate-intake-v1',
    'running',
    'license_verification',
    now() - interval '2 hours',
    null,
    '{"source":"Demo seed","nextAction":"Finalize compliance review"}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'candidate-intake-v1',
    'blocked',
    'license_upload_request',
    now() - interval '3 hours',
    null,
    '{"source":"Demo seed","blocker":"Missing license upload"}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    'candidate-intake-v1',
    'running',
    'interview_scheduling',
    now() - interval '5 hours',
    null,
    '{"source":"Demo seed","nextAction":"Monitor interview outcome"}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    'candidate-intake-v1',
    'completed',
    'rejected',
    now() - interval '1 day',
    now() - interval '23 hours',
    '{"source":"Demo seed","outcome":"Knockout failed"}'::jsonb
  );

insert into automation_jobs (applicant_id, workflow_run_id, job_type, job_label, job_status, priority, scheduled_for, attempts, payload)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'send_confirmation_sms', 'Send SMS confirmation', 'completed', 3, now() - interval '40 minutes', 1, '{"provider":"twilio_placeholder"}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'parse_resume', 'Parse resume and score experience', 'queued', 2, now(), 0, '{"engine":"openai_placeholder"}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'send_ai_assessment', 'Send AI screening assessment link', 'queued', 3, now() + interval '5 minutes', 0, '{"channel":"sms_email"}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'evaluate_ai_assessment', 'Evaluate AI screening assessment', 'queued', 4, now() + interval '10 minutes', 0, '{"engine":"openai_placeholder","mode":"structured_candidate_scoring"}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'evaluate_ai_assessment', 'Evaluate AI screening assessment', 'completed', 2, now() - interval '1 hour', 1, '{"score":88}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'verify_license', 'Verify license / guard card', 'running', 1, now() - interval '8 minutes', 1, '{"reviewType":"compliance"}'::jsonb),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'request_license_upload', 'Request missing license upload', 'blocked', 1, now() - interval '2 hours', 2, '{"missingDocument":"license"}'::jsonb),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'voice_interview_analysis', 'Analyze voice interview', 'completed', 2, now() - interval '2 hours', 1, '{"voiceScore":91}'::jsonb),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'send_scheduling_link', 'Send interview scheduling link', 'completed', 2, now() - interval '90 minutes', 1, '{"provider":"calcom_placeholder"}'::jsonb),
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'stop_workflow_knockout_failed', 'Stop workflow after failed knockout', 'completed', 1, now() - interval '23 hours', 1, '{"reason":"knockout_failed"}'::jsonb);

insert into notification_queue (applicant_id, automation_job_id, channel, recipient, subject, message, notification_status, scheduled_for, sent_at, metadata)
select
  job.applicant_id,
  job.id,
  'sms',
  applicant.phone,
  null,
  'Thank you for applying. Your application has been received by ViankaX Hiring Automation.',
  case when job.job_status = 'completed' then 'sent' else 'queued' end,
  job.scheduled_for,
  case when job.job_status = 'completed' then job.updated_at else null end,
  '{"template":"application_confirmation"}'::jsonb
from automation_jobs job
join applicants applicant on applicant.id = job.applicant_id
where job.job_type = 'send_confirmation_sms';

insert into notification_queue (applicant_id, automation_job_id, channel, recipient, subject, message, notification_status, scheduled_for, sent_at, metadata)
select
  job.applicant_id,
  job.id,
  'email',
  applicant.email,
  'Complete your ViankaX screening assessment',
  'Please complete your AI screening assessment so the hiring team can continue reviewing your application.',
  'queued',
  job.scheduled_for,
  null,
  '{"template":"ai_assessment_invite"}'::jsonb
from automation_jobs job
join applicants applicant on applicant.id = job.applicant_id
where job.job_type = 'send_ai_assessment';

delete from pipeline_stage_history
where applicant_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

insert into pipeline_stage_history (applicant_id, from_stage, to_stage, changed_by, reason)
values
  (
    '10000000-0000-0000-0000-000000000001',
    null,
    'New Applicant',
    'automation',
    'Application submitted and candidate entered the pipeline.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    null,
    'New Applicant',
    'automation',
    'Application submitted and candidate entered the pipeline.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'New Applicant',
    'Assessment Completed',
    'automation',
    'AI screening assessment completed with strong role-fit signals.'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    null,
    'New Applicant',
    'automation',
    'Application submitted and candidate entered the pipeline.'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Assessment Completed',
    'License Pending',
    'automation',
    'License upload is missing and compliance review is blocked.'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    null,
    'New Applicant',
    'automation',
    'Application submitted and candidate entered the pipeline.'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Voice Interview Complete',
    'Interview Scheduled',
    'automation',
    'Voice interview completed and manager interview was scheduled.'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    null,
    'New Applicant',
    'automation',
    'Application submitted and candidate entered the pipeline.'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'New Applicant',
    'Rejected',
    'automation',
    'Candidate failed knockout screening criteria.'
  );
