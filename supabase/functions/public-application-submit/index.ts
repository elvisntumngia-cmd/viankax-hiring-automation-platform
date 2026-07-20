import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const demoAutomationDelays = {
  aiAssessmentInviteMs: 15 * 1000,
}

const documentDefinitions = [
  { statusKey: 'resume', documentType: 'resume', bucket: 'resumes' },
  { statusKey: 'license', documentType: 'license', bucket: 'licenses' },
  { statusKey: 'governmentId', documentType: 'government_id', bucket: 'government-ids' },
  { statusKey: 'cpr', documentType: 'cpr', bucket: 'certifications' },
  { statusKey: 'firstAid', documentType: 'first_aid', bucket: 'certifications' },
  { statusKey: 'firearms', documentType: 'firearms', bucket: 'certifications' },
]

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ''))
}

function documentRowsFromApplication(applicantId: string, application: Record<string, any>, uploadedDocuments = {}, failedUploads = {}) {
  return documentDefinitions.map((definition) => ({
    applicant_id: applicantId,
    document_type: definition.documentType,
    file_name: uploadedDocuments[definition.statusKey]?.fileName ?? null,
    storage_bucket: uploadedDocuments[definition.statusKey]?.storageBucket ?? definition.bucket,
    storage_path: uploadedDocuments[definition.statusKey]?.storagePath ?? null,
    status: failedUploads[definition.statusKey]
      ? 'Upload Failed'
      : uploadedDocuments[definition.statusKey]?.status ?? application.documents?.[definition.statusKey] ?? 'Not Uploaded',
  }))
}

function automationJobRows(applicantId: string, workflowRunId: string, application: Record<string, any>, uploadedDocuments = {}) {
  const now = new Date()
  const scheduledNow = now.toISOString()
  const scheduledAiAssessmentInvite = new Date(now.getTime() + demoAutomationDelays.aiAssessmentInviteMs).toISOString()

  if (application.knockoutResult === 'Failed') {
    return [
      {
        applicant_id: applicantId,
        workflow_run_id: workflowRunId,
        job_type: 'stop_workflow_knockout_failed',
        job_label: 'Stop workflow after failed knockout',
        job_status: 'completed',
        priority: 1,
        scheduled_for: scheduledNow,
        payload: { reason: 'knockout_failed', flags: application.knockoutFlags ?? [] },
      },
    ]
  }

  return [
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_confirmation_sms',
      job_label: 'Send SMS confirmation',
      job_status: 'queued',
      priority: 2,
      scheduled_for: scheduledNow,
      payload: { channel: 'sms', provider: 'twilio_placeholder' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_confirmation_email',
      job_label: 'Send email confirmation',
      job_status: 'queued',
      priority: 2,
      scheduled_for: scheduledNow,
      payload: { channel: 'email', provider: 'resend_placeholder' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'parse_resume',
      job_label: 'Parse resume and score experience',
      job_status: uploadedDocuments.resume ? 'queued' : 'blocked',
      priority: 3,
      scheduled_for: scheduledNow,
      payload: { engine: 'openai_placeholder', resumeUploaded: Boolean(uploadedDocuments.resume) },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_ai_assessment',
      job_label: 'Send AI screening assessment link',
      job_status: 'queued',
      priority: 4,
      scheduled_for: scheduledAiAssessmentInvite,
      payload: { channel: 'sms_email' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'evaluate_ai_assessment',
      job_label: 'Evaluate AI screening assessment',
      job_status: 'queued',
      priority: 5,
      scheduled_for: scheduledNow,
      payload: { engine: 'openai_placeholder', mode: 'structured_candidate_scoring' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'verify_license',
      job_label: 'Verify license / guard card',
      job_status: uploadedDocuments.license ? 'queued' : 'blocked',
      priority: 3,
      scheduled_for: scheduledNow,
      payload: { licenseUploaded: Boolean(uploadedDocuments.license) },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'voice_interview_analysis',
      job_label: 'Analyze voice interview',
      job_status: 'blocked',
      priority: 7,
      scheduled_for: scheduledNow,
      last_error: 'Waiting for AI screening recommendation.',
      payload: { provider: 'voice_ai_placeholder', mode: 'automated_voice_screening' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_screening_complete_email',
      job_label: 'Send screening complete email',
      job_status: 'blocked',
      priority: 6,
      scheduled_for: scheduledNow,
      last_error: 'Waiting for candidate to complete AI screening.',
      payload: { channel: 'email', template: 'screening_complete_voice_trigger' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_scheduling_link',
      job_label: 'Schedule final in-person interview',
      job_status: 'blocked',
      priority: 8,
      scheduled_for: scheduledNow,
      last_error: 'Waiting for voice interview completion.',
      payload: { provider: 'calendar_placeholder', mode: 'auto_schedule_final_interview' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_final_candidate_email',
      job_label: 'Send final candidate email',
      job_status: 'blocked',
      priority: 9,
      scheduled_for: scheduledNow,
      last_error: 'Waiting for voice interview outcome.',
      payload: { channel: 'email', template: 'final_candidate_outcome' },
    },
  ]
}

function findAutomationJobId(jobs: Array<Record<string, any>>, jobType: string) {
  return jobs.find((job) => job.job_type === jobType)?.id ?? null
}

function notificationRows(applicantId: string, application: Record<string, any>, automationJobs: Array<Record<string, any>>) {
  if (application.knockoutResult === 'Failed') return []

  const scheduledNow = new Date().toISOString()
  const appBaseUrl = (Deno.env.get('APP_BASE_URL') ?? Deno.env.get('PUBLIC_APP_URL') ?? '').replace(/\/$/, '')
  const assessmentUrl = appBaseUrl ? `${appBaseUrl}/screening/${applicantId}` : `/screening/${applicantId}`

  return [
    {
      applicant_id: applicantId,
      automation_job_id: findAutomationJobId(automationJobs, 'send_confirmation_sms'),
      channel: 'sms',
      recipient: application.phone,
      message: 'Thank you for applying. Your ViankaX application has been received.',
      notification_status: 'queued',
      scheduled_for: scheduledNow,
      metadata: { template: 'application_confirmation' },
    },
    {
      applicant_id: applicantId,
      automation_job_id: findAutomationJobId(automationJobs, 'send_confirmation_email'),
      channel: 'email',
      recipient: application.email,
      subject: 'Your application was received - complete your screening',
      message: `Your application has been received. Please complete your AI screening assessment so the hiring team can continue reviewing your application: ${assessmentUrl}`,
      notification_status: 'queued',
      scheduled_for: scheduledNow,
      metadata: { template: 'application_confirmation_with_screening', assessmentUrl },
    },
  ]
}

function aiScreeningTaskRow(applicantId: string, application: Record<string, any>) {
  return {
    applicant_id: applicantId,
    task_status: application.knockoutResult === 'Failed' ? 'blocked' : 'queued',
    prompt_snapshot: 'Evaluate structured eligibility, availability, transportation, experience, site readiness, communication, and placement-matching signals.',
    candidate_context: {
      jobTitle: application.jobTitle,
      location: application.location,
      knockoutResult: application.knockoutResult,
      screeningAnswers: Object.fromEntries(application.screeningAnswers ?? []),
    },
    ai_summary: application.knockoutResult === 'Failed'
      ? 'AI screening blocked because required knockout criteria failed.'
      : null,
    risk_flags: application.knockoutFlags ?? [],
    recommendation: application.knockoutResult === 'Failed' ? 'Do Not Advance' : null,
    completed_at: application.knockoutResult === 'Failed' ? new Date().toISOString() : null,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase service role is not configured.' }, 500)
    }

    const { applicantId, application, uploadedDocuments = {}, failedUploads = {} } = await request.json()
    if (!isUuid(applicantId) || !application || !isUuid(application.jobId)) {
      return jsonResponse({ error: 'A valid applicant ID and job ID are required.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    })

    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .insert({
        id: applicantId,
        client_id: isUuid(application.clientId) ? application.clientId : null,
        job_id: application.jobId,
        site_id: isUuid(application.siteId) ? application.siteId : null,
        open_shift_id: isUuid(application.openShiftId) ? application.openShiftId : null,
        full_name: application.name,
        email: application.email,
        phone: application.phone,
        location: application.location,
        current_stage: application.stage,
        status: application.status,
        knockout_result: application.knockoutResult,
        license_status: application.licenseStatus,
        interview_status: application.interviewStatus,
        final_decision: application.decision,
        notes: application.notes,
        source: 'Applicant Portal',
        submitted_at: application.submittedAt,
      })
      .select('id')
      .single()

    if (applicantError) throw applicantError

    const { data: workflowRun, error: workflowError } = await supabase
      .from('workflow_runs')
      .insert({
        applicant_id: applicant.id,
        workflow_name: 'candidate-intake-v1',
        run_status: application.knockoutResult === 'Failed' ? 'completed' : 'queued',
        current_step: application.knockoutResult === 'Failed' ? 'knockout_failed' : 'confirmation',
        started_at: new Date().toISOString(),
        completed_at: application.knockoutResult === 'Failed' ? new Date().toISOString() : null,
        metadata: {
          source: 'Applicant Portal',
          jobTitle: application.jobTitle,
          nextAction: application.knockoutResult === 'Failed'
            ? 'Stop downstream workflow'
            : 'Queue confirmation and screening tasks',
        },
      })
      .select('id')
      .single()

    if (workflowError) throw workflowError

    const { data: automationJobs, error: automationError } = await supabase
      .from('automation_jobs')
      .insert(automationJobRows(applicant.id, workflowRun.id, application, uploadedDocuments))
      .select('id, job_type')

    if (automationError) throw automationError

    const failedUploadCount = Object.keys(failedUploads).length
    const automationEventRows = [
      {
        applicant_id: applicant.id,
        event_type: 'application_submitted',
        event_status: 'complete',
        event_label: 'Application Submitted',
        metadata: {
          source: 'Applicant Portal',
          jobTitle: application.jobTitle,
          knockoutResult: application.knockoutResult,
          description: 'Candidate submitted the application through the Applicant Portal.',
        },
      },
      {
        applicant_id: applicant.id,
        event_type: 'documents_uploaded',
        event_status: Object.keys(uploadedDocuments).length ? 'complete' : 'pending',
        event_label: 'Documents Uploaded',
        metadata: {
          uploadedCount: Object.keys(uploadedDocuments).length,
          failedUploadCount,
          failedUploads,
          description: failedUploadCount
            ? 'One or more document uploads failed, but the applicant workflow was still queued.'
            : Object.keys(uploadedDocuments).length
              ? 'Applicant documents were uploaded to Supabase Storage.'
              : 'Document upload records were created, but no file objects were attached.',
        },
      },
      {
        applicant_id: applicant.id,
        event_type: 'dashboard_sync',
        event_status: 'complete',
        event_label: 'Dashboard Sync',
        metadata: {
          description: 'Applicant record, scores, recommendation, documents, and answers were synced to the HR dashboard.',
        },
      },
      {
        applicant_id: applicant.id,
        event_type: 'pending_ai_review',
        event_status: 'current',
        event_label: 'Pending AI Review',
        metadata: {
          description: 'Resume parsing and AI screening are ready for the automation layer.',
        },
      },
    ]
    const screeningRows = (application.screeningAnswers ?? []).map(([question, answer]: [string, string]) => ({
      applicant_id: applicant.id,
      question,
      answer,
      category: 'application',
    }))

    const writeOperations = [
      supabase.from('candidate_scores').insert({
        applicant_id: applicant.id,
        resume_score: application.scores?.resumeScore,
        eligibility_score: application.scores?.eligibilityScore,
        screening_score: application.scores?.screeningScore,
        voice_interview_score: application.scores?.voiceInterviewScore,
        overall_candidate_score: application.scores?.overallCandidateScore,
      }),
      supabase.from('ai_recommendations').insert({
        applicant_id: applicant.id,
        recommendation: application.aiRecommendation?.label,
        confidence: application.aiRecommendation?.confidence,
        summary: application.aiRecommendation?.summary,
        risk_flags: application.knockoutFlags ?? [],
      }),
      supabase.from('automation_events').insert(automationEventRows),
      supabase.from('ai_screening_tasks').insert(aiScreeningTaskRow(applicant.id, application)),
      supabase.from('screening_answers').insert(screeningRows),
      supabase.from('applicant_documents').insert(documentRowsFromApplication(applicant.id, application, uploadedDocuments, failedUploads)),
    ]

    if (application.knockoutResult !== 'Failed') {
      writeOperations.push(supabase.from('notification_queue').insert(notificationRows(applicant.id, application, automationJobs ?? [])))
    }

    const results = await Promise.all(writeOperations)
    const writeError = results.find((result) => result.error)?.error
    if (writeError) throw writeError

    return jsonResponse({
      ok: true,
      intakeMode: 'service-role-edge-v2',
      applicantId: applicant.id,
      warning: failedUploadCount
        ? 'Application was saved and automation was queued, but one or more document uploads failed.'
        : null,
    })
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500)
  }
})
