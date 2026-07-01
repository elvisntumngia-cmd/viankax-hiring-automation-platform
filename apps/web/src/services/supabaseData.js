import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const pipelineStages = [
  'New Applicant',
  'Resume Screened',
  'Assessment Completed',
  'License Pending',
  'License Verified',
  'Voice Interview Complete',
  'Interview Scheduled',
  'Ready for Review',
  'Hired',
  'Rejected',
]

function mapJob(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    client: row.clients?.name ?? 'ViankaX Client',
    location: row.location,
    type: row.status === 'open' ? 'Open role' : row.status,
    pay: row.pay_range ?? 'Pay range pending',
    shifts: row.shift_options ?? [],
    licenseRequired: row.license_requirements?.[0] ?? 'License requirements pending',
    requirements: row.requirements ?? [],
    responsibilities: row.responsibilities ?? [],
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

const documentDefinitions = [
  { key: 'resume', documentType: 'resume', bucket: 'resumes', statusKey: 'resume' },
  { key: 'guardCard', documentType: 'license', bucket: 'licenses', statusKey: 'license' },
  { key: 'governmentId', documentType: 'government_id', bucket: 'government-ids', statusKey: 'governmentId' },
  { key: 'cpr', documentType: 'cpr', bucket: 'certifications', statusKey: 'cpr' },
  { key: 'firstAid', documentType: 'first_aid', bucket: 'certifications', statusKey: 'firstAid' },
  { key: 'firearms', documentType: 'firearms', bucket: 'certifications', statusKey: 'firearms' },
]

function safeFileName(fileName) {
  return fileName.replace(/[^a-z0-9.\-_]/gi, '-').toLowerCase()
}

async function uploadApplicationDocuments(applicantId, uploadFiles = {}) {
  const uploadedDocuments = {}

  for (const definition of documentDefinitions) {
    const file = uploadFiles[definition.key]

    if (file) {
      const storagePath = `${applicantId}/${definition.documentType}-${Date.now()}-${safeFileName(file.name)}`
      const { error } = await supabase.storage
        .from(definition.bucket)
        .upload(storagePath, file, { upsert: true })

      if (error) throw error

      uploadedDocuments[definition.statusKey] = {
        fileName: file.name,
        storageBucket: definition.bucket,
        storagePath,
        status: 'Uploaded',
      }
    }
  }

  return uploadedDocuments
}

function documentRowsFromApplication(applicantId, application, uploadedDocuments = {}) {
  return documentDefinitions.map((definition) => ({
    applicant_id: applicantId,
    document_type: definition.documentType,
    file_name: uploadedDocuments[definition.statusKey]?.fileName ?? null,
    storage_bucket: uploadedDocuments[definition.statusKey]?.storageBucket ?? definition.bucket,
    storage_path: uploadedDocuments[definition.statusKey]?.storagePath ?? null,
    status: uploadedDocuments[definition.statusKey]?.status ?? application.documents?.[definition.statusKey] ?? 'Not Uploaded',
  }))
}

function documentsFromRows(rows = []) {
  const documents = {
    resume: 'Not Uploaded',
    license: 'Not Uploaded',
    governmentId: 'Not Uploaded',
    cpr: 'Not Uploaded',
    firstAid: 'Not Uploaded',
    firearms: 'Not Uploaded',
  }

  rows.forEach((document) => {
    const value = document.status ?? 'Uploaded'
    if (document.document_type === 'resume') documents.resume = value
    if (document.document_type === 'license') documents.license = value
    if (document.document_type === 'government_id') documents.governmentId = value
    if (document.document_type === 'cpr') documents.cpr = value
    if (document.document_type === 'first_aid') documents.firstAid = value
    if (document.document_type === 'firearms') documents.firearms = value
  })

  return documents
}

function documentFilesFromRows(rows = []) {
  return rows
    .filter((document) => document.storage_bucket && document.storage_path)
    .map((document) => ({
      type: document.document_type,
      fileName: document.file_name ?? document.document_type,
      bucket: document.storage_bucket,
      path: document.storage_path,
      status: document.status,
    }))
}

function automationEventsFromRows(rows = []) {
  return rows.map((event) => ({
    type: event.event_type,
    status: event.event_status,
    label: event.event_label,
    description: event.metadata?.description ?? event.metadata?.note ?? '',
    createdAt: event.created_at,
  }))
}

function stageHistoryFromRows(rows = []) {
  return rows.map((history) => ({
    fromStage: history.from_stage,
    toStage: history.to_stage,
    changedBy: history.changed_by,
    reason: history.reason,
    createdAt: history.created_at,
  }))
}

function mapApplicant(row) {
  const scores = row.candidate_scores?.[0] ?? {}
  const recommendation = row.ai_recommendations?.[0] ?? {}
  const voiceInterview = row.voice_interviews?.[0] ?? {}
  const job = row.jobs ?? {}
  const client = row.clients ?? job.clients ?? {}
  const screeningAnswers = row.screening_answers?.length
    ? row.screening_answers.map((answer) => [answer.question, answer.answer ?? 'Not answered'])
    : [['Screening', 'No screening answers recorded yet.']]

  const automationEvents = automationEventsFromRows(row.automation_events)
  const stageHistory = stageHistoryFromRows(row.pipeline_stage_history)
  const latestEvent = [...automationEvents].sort((first, second) => {
    if (!first.createdAt || !second.createdAt) return 0
    return new Date(second.createdAt) - new Date(first.createdAt)
  })[0]

  return {
    id: row.id,
    name: row.full_name,
    role: job.title ?? 'Role pending',
    client: client.name ?? 'ViankaX Client',
    location: row.location ?? job.location ?? 'Location pending',
    phone: row.phone,
    email: row.email,
    stage: row.current_stage,
    status: row.status,
    score: scores.overall_candidate_score ?? null,
    scores: {
      resumeScore: scores.resume_score ?? null,
      eligibilityScore: scores.eligibility_score ?? null,
      screeningScore: scores.screening_score ?? null,
      voiceInterviewScore: scores.voice_interview_score ?? voiceInterview.score ?? null,
      overallCandidateScore: scores.overall_candidate_score ?? null,
    },
    licenseStatus: row.license_status,
    interviewStatus: row.interview_status,
    appliedAt: row.submitted_at
      ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(row.submitted_at))
      : 'Recently submitted',
    documents: documentsFromRows(row.applicant_documents),
    documentFiles: documentFilesFromRows(row.applicant_documents),
    automationEvents,
    stageHistory,
    latestEvent,
    lastUpdatedAt: row.updated_at ?? row.submitted_at,
    knockout: row.knockout_result,
    knockoutResult: row.knockout_result,
    aiSummary: recommendation.summary ?? 'AI recommendation has not been generated yet.',
    aiRecommendation: {
      label: recommendation.recommendation ?? 'Pending AI Review',
      confidence: recommendation.confidence ?? null,
      summary: recommendation.summary ?? 'AI recommendation has not been generated yet.',
    },
    screeningAnswers,
    voiceInterview: {
      score: voiceInterview.score ?? null,
      transcript: voiceInterview.transcript ?? 'Voice interview has not been triggered yet.',
      recommendation: voiceInterview.recommendation ?? 'Wait for screening and document review.',
    },
    interviewTime: row.interview_schedules?.[0]?.scheduled_for
      ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(row.interview_schedules[0].scheduled_for))
      : 'Not scheduled',
    notes: row.notes ?? 'No notes recorded yet.',
    decision: row.final_decision,
  }
}

export async function fetchJobs() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('jobs')
    .select('*, clients(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(mapJob)
}

export async function fetchApplicants() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('applicants')
    .select(`
      *,
      clients(name),
      jobs(title, location, clients(name)),
      applicant_documents(document_type, file_name, storage_bucket, storage_path, status),
      automation_events(event_type, event_status, event_label, metadata, created_at),
      pipeline_stage_history(from_stage, to_stage, changed_by, reason, created_at),
      screening_answers(question, answer),
      candidate_scores(
        resume_score,
        eligibility_score,
        screening_score,
        voice_interview_score,
        overall_candidate_score
      ),
      ai_recommendations(recommendation, confidence, summary, risk_flags),
      voice_interviews(score, transcript, recommendation, status),
      interview_schedules(scheduled_for, status)
    `)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data.map(mapApplicant)
}

export async function createDocumentSignedUrl(document) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.path, 60)

  if (error) throw error
  return data.signedUrl
}

export async function submitApplicationToSupabase(application, uploadFiles = {}) {
  if (!isSupabaseConfigured) {
    return { ok: false, error: new Error('Supabase is not configured.') }
  }

  const { data: applicant, error: applicantError } = await supabase
    .from('applicants')
    .insert({
      client_id: isUuid(application.clientId) ? application.clientId : null,
      job_id: isUuid(application.jobId) ? application.jobId : null,
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

  const applicantId = applicant.id
  const uploadedDocuments = await uploadApplicationDocuments(applicantId, uploadFiles)
  const scoreRow = {
    applicant_id: applicantId,
    resume_score: application.scores.resumeScore,
    eligibility_score: application.scores.eligibilityScore,
    screening_score: application.scores.screeningScore,
    voice_interview_score: application.scores.voiceInterviewScore,
    overall_candidate_score: application.scores.overallCandidateScore,
  }
  const recommendationRow = {
    applicant_id: applicantId,
    recommendation: application.aiRecommendation.label,
    confidence: application.aiRecommendation.confidence,
    summary: application.aiRecommendation.summary,
    risk_flags: application.knockoutFlags ?? [],
  }
  const automationEventRows = [
    {
      applicant_id: applicantId,
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
      applicant_id: applicantId,
      event_type: 'documents_uploaded',
      event_status: Object.keys(uploadedDocuments).length ? 'complete' : 'pending',
      event_label: 'Documents Uploaded',
      metadata: {
        uploadedCount: Object.keys(uploadedDocuments).length,
        description: Object.keys(uploadedDocuments).length
          ? 'Applicant documents were uploaded to Supabase Storage.'
          : 'Document upload records were created, but no file objects were attached.',
      },
    },
    {
      applicant_id: applicantId,
      event_type: 'dashboard_sync',
      event_status: 'complete',
      event_label: 'Dashboard Sync',
      metadata: {
        description: 'Applicant record, scores, recommendation, documents, and answers were synced to the HR dashboard.',
      },
    },
    {
      applicant_id: applicantId,
      event_type: 'pending_ai_review',
      event_status: 'current',
      event_label: 'Pending AI Review',
      metadata: {
        description: 'Resume parsing and AI screening are ready for the automation layer.',
      },
    },
  ]
  const screeningRows = application.screeningAnswers.map(([question, answer]) => ({
    applicant_id: applicantId,
    question,
    answer,
    category: 'application',
  }))

  const writeOperations = [
    supabase.from('candidate_scores').insert(scoreRow),
    supabase.from('ai_recommendations').insert(recommendationRow),
    supabase.from('automation_events').insert(automationEventRows),
    supabase.from('screening_answers').insert(screeningRows),
    supabase.from('applicant_documents').insert(documentRowsFromApplication(applicantId, application, uploadedDocuments)),
  ]

  const results = await Promise.all(writeOperations)
  const writeError = results.find((result) => result.error)?.error
  if (writeError) throw writeError

  return { ok: true, applicantId }
}

function getNextPipelineStage(currentStage) {
  const currentIndex = pipelineStages.indexOf(currentStage)
  if (currentIndex === -1) return 'Ready for Review'
  return pipelineStages[Math.min(currentIndex + 1, pipelineStages.length - 1)]
}

function getDecisionUpdate(applicant, decision) {
  if (decision === 'Advance') {
    const nextStage = getNextPipelineStage(applicant.stage)
    return {
      nextStage,
      status: nextStage === 'Hired' ? 'Qualified' : 'Qualified',
      finalDecision: 'Advance',
      eventType: 'hr_advanced_candidate',
      eventLabel: 'HR Advanced Candidate',
      eventDescription: `HR advanced candidate from ${applicant.stage} to ${nextStage}.`,
    }
  }

  if (decision === 'Hold') {
    return {
      nextStage: applicant.stage,
      status: 'Needs Review',
      finalDecision: 'Hold',
      eventType: 'hr_placed_candidate_on_hold',
      eventLabel: 'HR Placed Candidate On Hold',
      eventDescription: 'HR placed the candidate on hold for additional review.',
    }
  }

  return {
    nextStage: 'Rejected',
    status: 'Rejected',
    finalDecision: 'Reject',
    eventType: 'hr_rejected_candidate',
    eventLabel: 'HR Rejected Candidate',
    eventDescription: 'HR rejected the candidate and closed the hiring workflow.',
  }
}

export async function updateApplicantDecision(applicant, decision) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  if (!isUuid(applicant.id)) {
    throw new Error('Only Supabase applicant records can be updated.')
  }

  const update = getDecisionUpdate(applicant, decision)

  const { error: applicantError } = await supabase
    .from('applicants')
    .update({
      current_stage: update.nextStage,
      status: update.status,
      final_decision: update.finalDecision,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicant.id)

  if (applicantError) throw applicantError

  const historyRow = {
    applicant_id: applicant.id,
    from_stage: applicant.stage,
    to_stage: update.nextStage,
    changed_by: 'hr_dashboard',
    reason: update.eventDescription,
  }
  const eventRow = {
    applicant_id: applicant.id,
    event_type: update.eventType,
    event_status: 'complete',
    event_label: update.eventLabel,
    metadata: {
      decision: update.finalDecision,
      fromStage: applicant.stage,
      toStage: update.nextStage,
      description: update.eventDescription,
    },
  }

  const [{ error: historyError }, { error: eventError }] = await Promise.all([
    supabase.from('pipeline_stage_history').insert(historyRow),
    supabase.from('automation_events').insert(eventRow),
  ])

  if (historyError) throw historyError
  if (eventError) throw eventError

  return {
    stage: update.nextStage,
    status: update.status,
    decision: update.finalDecision,
    latestEvent: {
      type: eventRow.event_type,
      status: eventRow.event_status,
      label: eventRow.event_label,
      description: eventRow.metadata.description,
      createdAt: new Date().toISOString(),
    },
    automationEvents: [
      {
        type: eventRow.event_type,
        status: eventRow.event_status,
        label: eventRow.event_label,
        description: eventRow.metadata.description,
        createdAt: new Date().toISOString(),
      },
      ...(applicant.automationEvents ?? []),
    ],
    stageHistory: [
      {
        fromStage: historyRow.from_stage,
        toStage: historyRow.to_stage,
        changedBy: historyRow.changed_by,
        reason: historyRow.reason,
        createdAt: new Date().toISOString(),
      },
      ...(applicant.stageHistory ?? []),
    ],
    lastUpdatedAt: new Date().toISOString(),
  }
}
