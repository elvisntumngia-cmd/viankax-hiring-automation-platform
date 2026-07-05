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

export const defaultCalendarSettings = {
  provider: 'Internal calendar',
  interviewerEmail: 'hr@viankax.com',
  interviewDuration: '30',
  bufferTime: '15',
  schedulingWindow: '3 business days after voice interview',
}

function mapCalendarSettings(row) {
  if (!row) return defaultCalendarSettings

  return {
    provider: row.provider ?? defaultCalendarSettings.provider,
    interviewerEmail: row.interviewer_email ?? defaultCalendarSettings.interviewerEmail,
    interviewDuration: String(row.interview_duration_minutes ?? defaultCalendarSettings.interviewDuration),
    bufferTime: String(row.buffer_minutes ?? defaultCalendarSettings.bufferTime),
    schedulingWindow: row.scheduling_window ?? defaultCalendarSettings.schedulingWindow,
  }
}

function calendarProviderKey(provider) {
  const normalized = String(provider ?? '').toLowerCase()

  if (normalized.includes('google')) return 'google_calendar'
  if (normalized.includes('microsoft') || normalized.includes('outlook')) return 'microsoft_outlook'
  return 'internal_calendar'
}

function addBusinessDays(startDate, businessDays) {
  const date = new Date(startDate)
  let addedDays = 0

  while (addedDays < businessDays) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) addedDays += 1
  }

  return date
}

function scheduledDateFromCalendarSettings(settings) {
  const windowText = settings.schedulingWindow ?? defaultCalendarSettings.schedulingWindow
  const days = Number(windowText.match(/\d+/)?.[0] ?? 3)
  const usesBusinessDays = windowText.toLowerCase().includes('business')
  const scheduledDate = usesBusinessDays
    ? addBusinessDays(new Date(), days)
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  scheduledDate.setHours(10, 0, 0, 0)
  return scheduledDate.toISOString()
}

async function insertInterviewSchedule(scheduleRow) {
  const result = await supabase.from('interview_schedules').insert(scheduleRow)
  const { error } = result

  if (!error) return result

  const canFallback =
    error.code === '42703' ||
    error.message?.includes('interviewer_email') ||
    error.message?.includes('interview_duration_minutes') ||
    error.message?.includes('buffer_minutes') ||
    error.message?.includes('external_calendar_provider') ||
    error.message?.includes('sync_status')

  if (!canFallback) throw error

  const fallbackRow = {
    applicant_id: scheduleRow.applicant_id,
    provider: scheduleRow.provider,
    scheduled_for: scheduleRow.scheduled_for,
    scheduling_url: scheduleRow.scheduling_url,
    status: scheduleRow.status,
    updated_at: scheduleRow.updated_at,
  }
  const fallbackResult = await supabase.from('interview_schedules').insert(fallbackRow)
  const { error: fallbackError } = fallbackResult
  if (fallbackError) throw fallbackError
  return fallbackResult
}

function mapJob(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    siteId: row.site_id ?? null,
    openShiftId: row.open_shift_id ?? null,
    title: row.title,
    client: row.clients?.name ?? 'ViankaX Client',
    location: row.location,
    type: row.status === 'open' ? 'Open role' : row.status,
    pay: row.pay_range ?? 'Pay range pending',
    publicApplySlug: row.public_apply_slug ?? null,
    publicApplyUrl: row.public_apply_url ?? null,
    shifts: row.shift_options ?? [],
    licenseRequired: row.license_requirements?.[0] ?? 'License requirements pending',
    requirements: row.requirements ?? [],
    responsibilities: row.responsibilities ?? [],
  }
}

function mapJobSite(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    siteName: row.site_name,
    clientCustomerName: row.client_customer_name,
    location: row.location,
    address: row.address,
    city: row.city,
    state: row.state,
    requiredLicenseType: row.required_license_type,
    requiredTraits: row.required_traits ?? [],
    preferredTraits: row.preferred_traits ?? [],
    siteNotes: row.site_notes,
    status: row.status,
    openShiftsCount: row.open_shifts?.length ?? 0,
  }
}

function mapOpenShift(row) {
  return {
    id: row.id,
    siteId: row.site_id,
    shiftTitle: row.shift_title,
    siteName: row.job_sites?.site_name ?? 'Site pending',
    shiftType: row.shift_type,
    employmentType: row.employment_type,
    daysNeeded: row.days_needed ?? [],
    startTime: row.start_time,
    endTime: row.end_time,
    openPositions: row.open_positions,
    requiredLicenseType: row.required_license_type,
    minimumExperience: row.minimum_experience,
    requiredTraits: row.required_traits ?? [],
    preferredTraits: row.preferred_traits ?? [],
    urgency: row.urgency,
    status: row.status,
  }
}

function mapPlacementMatches(rows = []) {
  return rows
    .map((match) => ({
      id: match.id,
      matchScore: match.match_score ?? 0,
      reason: match.recommendation_reason ?? 'Placement recommendation pending.',
      strengths: match.strengths ?? [],
      concerns: match.concerns ?? [],
      status: match.match_status ?? 'Recommended',
      site: match.job_sites ? mapJobSite({ ...match.job_sites, open_shifts: [] }) : null,
      shift: match.open_shifts ? mapOpenShift(match.open_shifts) : null,
      createdAt: match.created_at,
    }))
    .sort((first, second) => second.matchScore - first.matchScore)
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
  const failedUploads = {}

  for (const definition of documentDefinitions) {
    const file = uploadFiles[definition.key]

    if (file) {
      const storagePath = `${applicantId}/${definition.documentType}-${Date.now()}-${safeFileName(file.name)}`
      const { error } = await supabase.storage
        .from(definition.bucket)
        .upload(storagePath, file, { upsert: true })

      if (error) {
        failedUploads[definition.statusKey] = error.message
        continue
      }

      uploadedDocuments[definition.statusKey] = {
        fileName: file.name,
        storageBucket: definition.bucket,
        storagePath,
        status: 'Uploaded',
      }
    }
  }

  return { uploadedDocuments, failedUploads }
}

function documentRowsFromApplication(applicantId, application, uploadedDocuments = {}, failedUploads = {}) {
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
  return [...rows]
    .sort((first, second) => new Date(first.created_at ?? 0) - new Date(second.created_at ?? 0))
    .map((event) => ({
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

function workflowRunsFromRows(rows = []) {
  return rows.map((run) => ({
    id: run.id,
    name: run.workflow_name,
    status: run.run_status,
    currentStep: run.current_step,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    metadata: run.metadata ?? {},
  }))
}

function automationJobsFromRows(rows = []) {
  return rows.map((job) => ({
    id: job.id,
    type: job.job_type,
    label: job.job_label,
    status: job.job_status,
    priority: job.priority,
    scheduledFor: job.scheduled_for,
    attempts: job.attempts,
    lastError: job.last_error,
    payload: job.payload ?? {},
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }))
}

function notificationsFromRows(rows = []) {
  return rows.map((notification) => ({
    id: notification.id,
    channel: notification.channel,
    recipient: notification.recipient,
    subject: notification.subject,
    message: notification.message,
    status: notification.notification_status,
    scheduledFor: notification.scheduled_for,
    sentAt: notification.sent_at,
    lastError: notification.last_error,
    metadata: notification.metadata ?? {},
  }))
}

function aiScreeningTasksFromRows(rows = []) {
  return rows.map((task) => ({
    id: task.id,
    status: task.task_status,
    promptSnapshot: task.prompt_snapshot,
    candidateContext: task.candidate_context ?? {},
    summary: task.ai_summary,
    roleFitScore: task.role_fit_score,
    professionalismScore: task.professionalism_score,
    communicationScore: task.communication_score,
    availabilityScore: task.availability_score,
    riskFlags: task.risk_flags ?? [],
    recommendation: task.recommendation,
    completedAt: task.completed_at,
    templateName: task.ai_screening_templates?.name ?? 'AI screening template',
    roleFamily: task.ai_screening_templates?.role_family ?? 'general',
  }))
}

function mapAutomationQueueJob(job) {
  return {
    id: job.id,
    applicantId: job.applicant_id,
    workflowRunId: job.workflow_run_id,
    type: job.job_type,
    label: job.job_label,
    status: job.job_status,
    priority: job.priority,
    scheduledFor: job.scheduled_for,
    attempts: job.attempts,
    lastError: job.last_error,
    payload: job.payload ?? {},
    applicantName: job.applicants?.full_name ?? 'Unknown applicant',
    applicantStage: job.applicants?.current_stage ?? 'Stage pending',
    role: job.applicants?.jobs?.title ?? 'Role pending',
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }
}

function mapApplicant(row) {
  const scores = row.candidate_scores?.[0] ?? {}
  const recommendation = row.ai_recommendations?.[0] ?? {}
  const voiceInterview = row.voice_interviews?.[0] ?? {}
  const interviewSchedule = row.interview_schedules?.[0] ?? {}
  const hasScheduledInterview =
    row.interview_status === 'Scheduled' ||
    ['Interview Scheduled', 'Ready for Review'].includes(row.current_stage)
  const placementMatches = mapPlacementMatches(row.placement_matches)
  const job = row.jobs ?? {}
  const client = row.clients ?? job.clients ?? {}
  const screeningAnswers = row.screening_answers?.length
    ? row.screening_answers.map((answer) => [answer.question, answer.answer ?? 'Not answered'])
    : [['Screening', 'No screening answers recorded yet.']]

  const automationEvents = automationEventsFromRows(row.automation_events)
  const stageHistory = stageHistoryFromRows(row.pipeline_stage_history)
  const workflowRuns = workflowRunsFromRows(row.workflow_runs)
  const automationJobs = automationJobsFromRows(row.automation_jobs)
  const notifications = notificationsFromRows(row.notification_queue)
  const aiScreeningTasks = aiScreeningTasksFromRows(row.ai_screening_tasks)
  const latestAiScreening = aiScreeningTasks[0]
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
    workflowRuns,
    automationJobs,
    notifications,
    aiScreeningTasks,
    aiScreening: latestAiScreening ?? {
      status: 'not_started',
      summary: 'AI screening has not been queued yet.',
      roleFitScore: null,
      professionalismScore: null,
      communicationScore: null,
      availabilityScore: null,
      riskFlags: [],
      recommendation: 'Pending AI Screening',
    },
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
      status: voiceInterview.status ?? row.interview_status ?? 'Not Started',
      recordingUrl: voiceInterview.recording_url ?? null,
      transcript: voiceInterview.transcript ?? 'Voice interview has not been triggered yet.',
      recommendation: voiceInterview.recommendation ?? 'Wait for screening and document review.',
    },
    finalInterview: {
      status: interviewSchedule.status ?? (hasScheduledInterview ? 'Scheduled' : 'Not Scheduled'),
      scheduledFor: interviewSchedule.scheduled_for ?? null,
      schedulingUrl: interviewSchedule.scheduling_url ?? null,
      provider: interviewSchedule.provider ?? null,
      interviewerEmail: interviewSchedule.interviewer_email ?? null,
      interviewDurationMinutes: interviewSchedule.interview_duration_minutes ?? null,
      bufferMinutes: interviewSchedule.buffer_minutes ?? null,
      externalCalendarProvider: interviewSchedule.external_calendar_provider ?? null,
      externalEventId: interviewSchedule.external_event_id ?? null,
      syncStatus: interviewSchedule.sync_status ?? 'Not Connected',
      syncError: interviewSchedule.sync_error ?? null,
    },
    placementMatches,
    placementRecommendation: placementMatches.length
      ? {
        matchScore: placementMatches[0].matchScore,
        reason: placementMatches[0].reason,
        strengths: placementMatches[0].strengths,
        concerns: placementMatches[0].concerns,
        bestSite: placementMatches[0].site,
        bestShift: placementMatches[0].shift,
        alternatives: placementMatches.slice(1).map((match) => ({
          shiftId: match.shift?.id ?? match.id,
          score: match.matchScore,
          shift: match.shift,
          site: match.site,
        })),
      }
      : null,
    interviewTime: interviewSchedule.scheduled_for
      ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(interviewSchedule.scheduled_for))
      : hasScheduledInterview
        ? 'Scheduled - date/time pending sync'
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

export async function fetchAllJobs() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('jobs')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(mapJob)
}

export async function fetchClients() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, industry, status')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchJobSites() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('job_sites')
    .select('*, open_shifts(id)')
    .order('site_name', { ascending: true })

  if (error) throw error
  return data.map(mapJobSite)
}

export async function fetchOpenShifts() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('open_shifts')
    .select('*, job_sites(site_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(mapOpenShift)
}

export async function fetchCalendarSettings() {
  if (!isSupabaseConfigured) return defaultCalendarSettings

  const { data, error } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('settings_key', 'default')
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.message?.includes('calendar_settings')) {
      return defaultCalendarSettings
    }

    throw error
  }

  return mapCalendarSettings(data)
}

export async function saveCalendarSettings(settings) {
  const row = {
    settings_key: 'default',
    provider: settings.provider,
    interviewer_email: settings.interviewerEmail,
    interview_duration_minutes: Number(settings.interviewDuration),
    buffer_minutes: Number(settings.bufferTime),
    scheduling_window: settings.schedulingWindow,
    updated_at: new Date().toISOString(),
  }

  if (!isSupabaseConfigured) return mapCalendarSettings(row)

  const { data, error } = await supabase
    .from('calendar_settings')
    .upsert(row, { onConflict: 'settings_key' })
    .select('*')
    .single()

  if (error) throw error

  return mapCalendarSettings(data)
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function saveJobSite(site) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const row = {
    client_id: site.clientId || null,
    site_name: site.siteName,
    client_customer_name: site.clientCustomerName,
    location: site.location,
    address: site.address,
    city: site.city,
    state: site.state,
    required_license_type: site.requiredLicenseType,
    required_traits: splitList(site.requiredTraits),
    preferred_traits: splitList(site.preferredTraits),
    site_notes: site.siteNotes,
    status: site.status,
    updated_at: new Date().toISOString(),
  }

  const request = site.id
    ? supabase.from('job_sites').update(row).eq('id', site.id).select('*, open_shifts(id)').single()
    : supabase.from('job_sites').insert(row).select('*, open_shifts(id)').single()

  const { data, error } = await request
  if (error) throw error
  return mapJobSite(data)
}

export async function saveOpenShift(shift) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const row = {
    site_id: shift.siteId,
    shift_title: shift.shiftTitle,
    shift_type: shift.shiftType,
    employment_type: shift.employmentType,
    days_needed: splitList(shift.daysNeeded),
    start_time: shift.startTime,
    end_time: shift.endTime,
    open_positions: Number(shift.openPositions) || 1,
    required_license_type: shift.requiredLicenseType,
    minimum_experience: shift.minimumExperience,
    required_traits: splitList(shift.requiredTraits),
    preferred_traits: splitList(shift.preferredTraits),
    urgency: shift.urgency,
    status: shift.status,
    updated_at: new Date().toISOString(),
  }

  const request = shift.id
    ? supabase.from('open_shifts').update(row).eq('id', shift.id).select('*, job_sites(site_name)').single()
    : supabase.from('open_shifts').insert(row).select('*, job_sites(site_name)').single()

  const { data, error } = await request
  if (error) throw error
  return mapOpenShift(data)
}

export async function saveJob(job) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const row = {
    client_id: job.clientId,
    site_id: job.siteId || null,
    open_shift_id: job.openShiftId || null,
    title: job.title,
    location: job.location,
    pay_range: job.pay,
    shift_options: splitList(job.shifts),
    requirements: splitList(job.requirements),
    license_requirements: splitList(job.licenseRequired),
    responsibilities: splitList(job.responsibilities),
    public_apply_slug: job.publicApplySlug || null,
    public_apply_url: job.publicApplyUrl || (job.id ? `/apply/${job.id}` : null),
    status: job.status,
    updated_at: new Date().toISOString(),
  }

  const request = job.id
    ? supabase.from('jobs').update(row).eq('id', job.id).select('*, clients(name)').single()
    : supabase.from('jobs').insert(row).select('*, clients(name)').single()

  const { data, error } = await request
  if (error) throw error
  return mapJob(data)
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
      workflow_runs(id, workflow_name, run_status, current_step, started_at, completed_at, metadata, created_at, updated_at),
      automation_jobs(id, job_type, job_label, job_status, priority, scheduled_for, attempts, last_error, payload, created_at, updated_at),
      notification_queue(id, channel, recipient, subject, message, notification_status, scheduled_for, sent_at, last_error, metadata),
      ai_screening_tasks(
        id,
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
        completed_at,
        ai_screening_templates(name, role_family)
      ),
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
      voice_interviews(provider, recording_url, score, transcript, recommendation, status),
      interview_schedules(provider, scheduled_for, scheduling_url, status, interviewer_email, interview_duration_minutes, buffer_minutes, external_calendar_provider, external_event_id, sync_status, sync_error),
      placement_matches(
        id,
        match_score,
        recommendation_reason,
        strengths,
        concerns,
        match_status,
        created_at,
        job_sites(*),
        open_shifts(*, job_sites(site_name))
      )
    `)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data.map(mapApplicant)
}

export async function lookupApplicationStatus({ email, phone }) {
  if (!isSupabaseConfigured) return null

  let query = supabase
    .from('applicants')
    .select(`
      *,
      clients(name),
      jobs(title, location, clients(name)),
      applicant_documents(document_type, file_name, storage_bucket, storage_path, status),
      automation_events(event_type, event_status, event_label, metadata, created_at),
      workflow_runs(id, workflow_name, run_status, current_step, started_at, completed_at, metadata, created_at, updated_at),
      automation_jobs(id, job_type, job_label, job_status, priority, scheduled_for, attempts, last_error, payload, created_at, updated_at),
      notification_queue(id, channel, recipient, subject, message, notification_status, scheduled_for, sent_at, last_error, metadata),
      ai_screening_tasks(
        id,
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
        completed_at,
        ai_screening_templates(name, role_family)
      ),
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
      voice_interviews(provider, recording_url, score, transcript, recommendation, status),
      interview_schedules(provider, scheduled_for, scheduling_url, status, interviewer_email, interview_duration_minutes, buffer_minutes, external_calendar_provider, external_event_id, sync_status, sync_error),
      placement_matches(
        id,
        match_score,
        recommendation_reason,
        strengths,
        concerns,
        match_status,
        created_at,
        job_sites(*),
        open_shifts(*, job_sites(site_name))
      )
    `)
    .order('submitted_at', { ascending: false })
    .limit(1)

  if (email) query = query.ilike('email', email.trim())
  if (phone) query = query.eq('phone', phone.trim())

  const { data, error } = await query
  if (error) throw error
  return data?.[0] ? mapApplicant(data[0]) : null
}

export async function fetchApplicantForScreening(applicantId) {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('applicants')
    .select(`
      *,
      clients(name),
      jobs(title, location, clients(name)),
      applicant_documents(document_type, file_name, storage_bucket, storage_path, status),
      automation_events(event_type, event_status, event_label, metadata, created_at),
      workflow_runs(id, workflow_name, run_status, current_step, started_at, completed_at, metadata, created_at, updated_at),
      automation_jobs(id, job_type, job_label, job_status, priority, scheduled_for, attempts, last_error, payload, created_at, updated_at),
      notification_queue(id, channel, recipient, subject, message, notification_status, scheduled_for, sent_at, last_error, metadata),
      ai_screening_tasks(
        id,
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
        completed_at,
        ai_screening_templates(name, role_family)
      ),
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
      voice_interviews(provider, recording_url, score, transcript, recommendation, status),
      interview_schedules(provider, scheduled_for, scheduling_url, status, interviewer_email, interview_duration_minutes, buffer_minutes, external_calendar_provider, external_event_id, sync_status, sync_error),
      placement_matches(
        id,
        match_score,
        recommendation_reason,
        strengths,
        concerns,
        match_status,
        created_at,
        job_sites(*),
        open_shifts(*, job_sites(site_name))
      )
    `)
    .eq('id', applicantId)
    .single()

  if (error) throw error
  return mapApplicant(data)
}

const aiScreeningAnswerLabels = {
  authorizedToWork: 'Are you authorized to work in the United States?',
  backgroundCheck: 'Are you willing to undergo a background check?',
  hasSecurityLicense: 'Do you currently hold a valid security license or guard card?',
  licenseType: 'What type of license do you currently hold?',
  shiftTypes: 'Which shift types are you available for?',
  availableDays: 'Which days are you available?',
  weekendHolidayOvertime: 'Are you available for weekends, holidays, or overtime if needed?',
  startDate: 'When can you start?',
  reliableTransportation: 'Do you have reliable transportation?',
  maxCommute: 'What is the maximum commute distance you are comfortable with?',
  yearsExperience: 'How many years of security experience do you have?',
  environments: 'What security environments have you worked in before?',
  supervisedTeam: 'Have you supervised a team before?',
  incidentReporting: 'Do you have incident reporting experience?',
  digitalReportingTools: 'Are you comfortable using mobile apps or digital reporting tools while on duty?',
  standingWalking: 'Are you comfortable standing or walking for long periods?',
  outdoorWork: 'Are you comfortable working outdoors if required?',
  workingAlone: 'Are you comfortable working alone at a site if assigned?',
  interestReason: 'Why are you interested in this security role?',
  preferredSecurityWork: 'What type of security work do you prefer and why?',
  reliabilityReason: 'What makes you a reliable candidate for this role?',
}

function normalizedList(value) {
  return Array.isArray(value) ? value : value ? [value] : []
}

function writtenResponseScore(answers) {
  const responses = [answers.interestReason, answers.preferredSecurityWork, answers.reliabilityReason]
  const totalLength = responses.reduce((sum, answer) => sum + String(answer ?? '').trim().length, 0)
  const completeResponses = responses.filter((answer) => String(answer ?? '').trim().length >= 25).length
  const positiveSignals = ['reliable', 'professional', 'team', 'serve', 'protect', 'safe', 'communication', 'experience', 'available']
  const combined = responses.join(' ').toLowerCase()
  const signalBonus = positiveSignals.filter((signal) => combined.includes(signal)).length * 2

  return Math.min(96, 58 + completeResponses * 9 + Math.min(18, Math.floor(totalLength / 45)) + signalBonus)
}

function scoreAssessmentAnswers(answers, applicant = {}) {
  const strengths = []
  const concerns = []
  const knockoutConcerns = []
  const shiftTypes = normalizedList(answers.shiftTypes)
  const availableDays = normalizedList(answers.availableDays)
  const environmentsWorked = normalizedList(answers.environments)
  const requiredLicenseText = `${applicant.requiredLicenseType ?? ''} ${applicant.role ?? ''}`.toLowerCase()
  const licenseIsRequired = requiredLicenseText.includes('spo') ||
    requiredLicenseText.includes('armed') ||
    requiredLicenseText.includes('so') ||
    requiredLicenseText.includes('license') ||
    requiredLicenseText.includes('guard card')
  const hasUsefulLicense = answers.hasSecurityLicense === 'Yes' && !['None', ''].includes(answers.licenseType)

  let eligibilityScore = 100
  if (answers.authorizedToWork !== 'Yes') {
    eligibilityScore -= 50
    knockoutConcerns.push('Not authorized to work in the United States')
  } else {
    strengths.push('Authorized to work in the United States')
  }

  if (answers.backgroundCheck !== 'Yes') {
    eligibilityScore -= 40
    knockoutConcerns.push('Not willing to undergo background check')
  } else {
    strengths.push('Willing to undergo background check')
  }

  if (!hasUsefulLicense) {
    eligibilityScore -= licenseIsRequired ? 30 : 10
    concerns.push(licenseIsRequired ? 'Required license needs HR/compliance review' : 'No current security license listed')
  } else {
    strengths.push(`Valid ${answers.licenseType} license/guard card`)
  }
  eligibilityScore = Math.max(0, eligibilityScore)

  const availabilityScore = Math.min(100, 45 + shiftTypes.length * 8 + availableDays.length * 4 + (answers.weekendHolidayOvertime === 'Yes' ? 15 : 0) + (answers.startDate ? 8 : 0))
  if (shiftTypes.includes('Flexible')) strengths.push('Flexible shift availability')
  if (answers.weekendHolidayOvertime === 'Yes') strengths.push('Available for weekends, holidays, or overtime')
  if (availableDays.length < 3) concerns.push('Limited weekly availability')

  const transportationScore = answers.reliableTransportation === 'Yes'
    ? answers.maxCommute === '30+ miles'
      ? 100
      : answers.maxCommute === '20 miles'
        ? 92
        : 84
    : 25
  if (answers.reliableTransportation === 'Yes') strengths.push('Reliable transportation')
  if (answers.reliableTransportation !== 'Yes') {
    concerns.push('No reliable transportation for site-based work')
    knockoutConcerns.push('No reliable transportation for site-based work')
  }

  const experienceBase = {
    'No experience': 45,
    'Less than 1 year': 58,
    '1-2 years': 72,
    '3-5 years': 86,
    '5+ years': 95,
  }[answers.yearsExperience] ?? 55
  const environmentBonus = Math.min(12, environmentsWorked.filter((environment) => !['None', 'Other'].includes(environment)).length * 3)
  const experienceScore = Math.min(100, experienceBase + environmentBonus + (answers.incidentReporting === 'Yes' ? 5 : 0) + (answers.supervisedTeam === 'Yes' ? 4 : 0))
  if (!['No experience', 'Less than 1 year'].includes(answers.yearsExperience)) strengths.push(`${answers.yearsExperience} of security experience`)
  if (answers.incidentReporting !== 'Yes') concerns.push('Limited incident reporting experience')
  if (answers.supervisedTeam !== 'Yes') concerns.push('No supervisory experience')

  const siteReadinessScore = Math.min(100, 40 +
    (answers.standingWalking === 'Yes' ? 20 : 0) +
    (answers.outdoorWork === 'Yes' ? 15 : 0) +
    (answers.workingAlone === 'Yes' ? 15 : 0) +
    (answers.digitalReportingTools === 'Yes' ? 10 : 0))
  if (answers.standingWalking === 'Yes') strengths.push('Comfortable standing or walking for long periods')
  if (answers.outdoorWork !== 'Yes') concerns.push('May not prefer outdoor posts')
  if (answers.workingAlone !== 'Yes') concerns.push('May not prefer solo site assignments')

  const communicationScore = writtenResponseScore(answers)
  const screeningScore = Math.round(
    eligibilityScore * 0.22 +
    availabilityScore * 0.16 +
    transportationScore * 0.16 +
    experienceScore * 0.18 +
    siteReadinessScore * 0.14 +
    communicationScore * 0.14,
  )
  const overallCandidateScore = screeningScore

  const recommendation = knockoutConcerns.length
    ? 'Not Recommended'
    : screeningScore >= 85
      ? 'Strong Candidate'
      : screeningScore >= 72
        ? 'Moderate Candidate'
        : screeningScore >= 60
          ? 'Needs Review'
          : 'Not Recommended'
  const suggestedNextStep = knockoutConcerns.length
    ? 'Hold for HR review'
    : !hasUsefulLicense && licenseIsRequired
      ? 'Proceed to license verification'
      : screeningScore >= 72
        ? 'Proceed to voice interview'
        : 'Hold for HR review'

  return {
    eligibilityScore,
    availabilityScore,
    transportationScore,
    experienceScore,
    siteReadinessScore,
    communicationScore,
    screeningScore,
    overallCandidateScore,
    roleFitScore: experienceScore,
    professionalismScore: siteReadinessScore,
    riskFlags: [...new Set([...knockoutConcerns, ...concerns])],
    strengths: [...new Set(strengths)].slice(0, 6),
    concerns: [...new Set(concerns)].slice(0, 6),
    knockoutConcerns,
    recommendation,
    suggestedNextStep,
    placementSignals: {
      licenseType: answers.licenseType,
      shiftTypes,
      availableDays,
      maxCommute: answers.maxCommute,
      environmentsWorked,
      traits: [
        answers.incidentReporting === 'Yes' ? 'incident reporting' : null,
        answers.supervisedTeam === 'Yes' ? 'supervisor experience' : null,
        answers.digitalReportingTools === 'Yes' ? 'digital reporting' : null,
        answers.outdoorWork === 'Yes' ? 'outdoor tolerance' : null,
        answers.workingAlone === 'Yes' ? 'solo post readiness' : null,
      ].filter(Boolean),
    },
  }
}

export async function submitAiScreeningAssessment(applicantId, answers, applicant = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const now = new Date().toISOString()
  const scores = scoreAssessmentAnswers(answers, applicant)
  const answerRows = Object.entries(answers).map(([question, answer]) => ({
    applicant_id: applicantId,
    question: aiScreeningAnswerLabels[question] ?? question,
    answer: Array.isArray(answer) ? answer.join(', ') : answer,
    category: 'ai_assessment',
  }))
  const aiSummary = `${scores.recommendation}. ${scores.strengths.length ? `Strengths: ${scores.strengths.join(', ')}.` : ''} ${scores.concerns.length ? `Concerns: ${scores.concerns.join(', ')}.` : ''} Suggested next step: ${scores.suggestedNextStep}.`

  const operations = [
    supabase.from('screening_answers').insert(answerRows),
    supabase
      .from('ai_screening_tasks')
      .update({
        task_status: 'completed',
        candidate_context: {
          answers,
          categoryScores: {
            eligibility: scores.eligibilityScore,
            availability: scores.availabilityScore,
            transportation: scores.transportationScore,
            experience: scores.experienceScore,
            siteReadiness: scores.siteReadinessScore,
            communication: scores.communicationScore,
          },
          strengths: scores.strengths,
          concerns: scores.concerns,
          suggestedNextStep: scores.suggestedNextStep,
          placementSignals: scores.placementSignals,
        },
        ai_summary: aiSummary,
        role_fit_score: scores.roleFitScore,
        professionalism_score: scores.professionalismScore,
        communication_score: scores.communicationScore,
        availability_score: scores.availabilityScore,
        risk_flags: scores.riskFlags,
        recommendation: scores.recommendation,
        completed_at: now,
        updated_at: now,
      })
      .eq('applicant_id', applicantId)
      .in('task_status', ['queued', 'running', 'completed']),
    supabase
      .from('candidate_scores')
      .upsert({
        applicant_id: applicantId,
        eligibility_score: scores.eligibilityScore,
        screening_score: scores.screeningScore,
        overall_candidate_score: scores.overallCandidateScore,
        updated_at: now,
      }, { onConflict: 'applicant_id' }),
    supabase
      .from('ai_recommendations')
      .upsert({
        applicant_id: applicantId,
        recommendation: scores.recommendation,
        confidence: scores.screeningScore,
        summary: aiSummary,
        risk_flags: scores.concerns,
        updated_at: now,
      }, { onConflict: 'applicant_id' }),
    supabase
      .from('automation_jobs')
      .update({
        job_status: 'completed',
        last_error: null,
        updated_at: now,
      })
      .eq('applicant_id', applicantId)
      .eq('job_type', 'evaluate_ai_assessment')
      .in('job_status', ['queued', 'running']),
    supabase
      .from('automation_events')
      .update({
        event_status: 'complete',
        metadata: {
          description: 'AI screening review moved forward after applicant completed the structured assessment.',
        },
      })
      .eq('applicant_id', applicantId)
      .eq('event_type', 'pending_ai_review')
      .eq('event_status', 'current'),
    supabase
      .from('applicants')
      .update({
        current_stage: 'Assessment Completed',
        status: ['Strong Candidate', 'Moderate Candidate'].includes(scores.recommendation) ? 'Qualified' : 'Needs Review',
        updated_at: now,
      })
      .eq('id', applicantId),
    supabase
      .from('pipeline_stage_history')
      .insert({
        applicant_id: applicantId,
        from_stage: 'New Applicant',
        to_stage: 'Assessment Completed',
        changed_by: 'ai_screening_page',
        reason: 'Applicant completed AI screening assessment.',
      }),
    supabase
      .from('automation_events')
      .insert([
        {
          applicant_id: applicantId,
          event_type: 'ai_screening_completed',
          event_status: 'complete',
          event_label: 'AI Screening Completed',
          metadata: {
            description: 'Applicant completed the structured AI chat screening assessment.',
            scores,
          },
        },
        {
          applicant_id: applicantId,
          event_type: 'candidate_scored',
          event_status: 'complete',
          event_label: 'Candidate Scored',
          metadata: {
            description: `Overall screening score generated: ${scores.screeningScore}%.`,
            screeningScore: scores.screeningScore,
            recommendation: scores.recommendation,
          },
        },
        {
          applicant_id: applicantId,
          event_type: 'next_step_recommended',
          event_status: 'current',
          event_label: 'Next Step Recommended',
          metadata: {
            description: scores.suggestedNextStep,
            suggestedNextStep: scores.suggestedNextStep,
            placementSignals: scores.placementSignals,
          },
        },
      ]),
    supabase
      .from('workflow_runs')
      .update({
        run_status: 'running',
        current_step: scores.suggestedNextStep,
        metadata: {
          nextAction: scores.suggestedNextStep,
          screeningRecommendation: scores.recommendation,
          screeningScore: scores.screeningScore,
        },
        updated_at: now,
      })
      .eq('applicant_id', applicantId),
  ]

  const results = await Promise.all(operations)
  const operationError = results.find((result) => result.error)?.error
  if (operationError) throw operationError

  return {
    ok: true,
    scores,
    summary: aiSummary,
  }
}

export async function fetchAutomationQueueSummary() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('automation_jobs')
    .select(`
      id,
      job_type,
      job_label,
      job_status,
      priority,
      scheduled_for,
      attempts,
      last_error,
      created_at,
      updated_at,
      applicants(full_name, current_stage, jobs(title))
    `)
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (error) throw error

  return data.map((job) => ({
    ...mapAutomationQueueJob(job),
  }))
}

export async function fetchAutomationRunHistory() {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('automation_events')
    .select(`
      id,
      event_type,
      event_status,
      event_label,
      metadata,
      created_at,
      applicants(full_name, current_stage, jobs(title))
    `)
    .order('created_at', { ascending: false })
    .limit(16)

  if (error) throw error

  return data.map((event) => ({
    id: event.id,
    type: event.event_type,
    status: event.event_status,
    label: event.event_label,
    description: event.metadata?.description ?? '',
    processor: event.metadata?.processor ?? 'frontend_or_seed',
    provider: event.metadata?.provider ?? event.metadata?.providerMessageId ?? 'not_applicable',
    applicantName: event.applicants?.full_name ?? 'Unknown applicant',
    applicantStage: event.applicants?.current_stage ?? 'Stage pending',
    role: event.applicants?.jobs?.title ?? 'Role pending',
    createdAt: event.created_at,
  }))
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

async function updateWorkflowAfterJob(workflowRunId) {
  if (!workflowRunId) return

  const { data: jobs, error } = await supabase
    .from('automation_jobs')
    .select('job_status')
    .eq('workflow_run_id', workflowRunId)

  if (error) throw error

  const hasQueued = jobs.some((job) => job.job_status === 'queued' || job.job_status === 'running')
  const hasBlocked = jobs.some((job) => job.job_status === 'blocked')
  const nextStatus = hasBlocked ? 'blocked' : hasQueued ? 'running' : 'completed'

  const { error: workflowError } = await supabase
    .from('workflow_runs')
    .update({
      run_status: nextStatus,
      current_step: nextStatus === 'completed' ? 'completed' : 'automation_processing',
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflowRunId)

  if (workflowError) throw workflowError
}

function processedEventForJob(job) {
  const eventMap = {
    send_confirmation_sms: ['confirmation_sms_sent', 'Confirmation SMS Sent', 'Placeholder SMS confirmation was marked as sent.'],
    send_confirmation_email: ['confirmation_email_sent', 'Confirmation Email Sent', 'Placeholder email confirmation was marked as sent.'],
    parse_resume: ['resume_screened', 'Resume Screened', 'Placeholder resume parsing completed and candidate moved forward.'],
    send_ai_assessment: ['ai_assessment_sent', 'AI Assessment Sent', 'Placeholder AI screening assessment invite was queued for the candidate.'],
    evaluate_ai_assessment: ['ai_screening_evaluated', 'AI Screening Evaluated', 'Placeholder AI screening evaluation generated structured candidate scores.'],
    verify_license: ['license_verification_completed', 'License Verification Completed', 'Placeholder license verification completed.'],
    send_scheduling_link: ['scheduling_link_sent', 'Scheduling Link Sent', 'Placeholder scheduling link was marked as sent.'],
    voice_interview_analysis: ['voice_interview_analyzed', 'Voice Interview Analyzed', 'Placeholder voice interview analysis completed.'],
  }
  const [type, label, description] = eventMap[job.job_type] ?? ['automation_job_processed', 'Automation Job Processed', 'Placeholder automation job completed.']

  return {
    applicant_id: job.applicant_id,
    event_type: type,
    event_status: 'complete',
    event_label: label,
    metadata: {
      automationJobId: job.id,
      jobType: job.job_type,
      description,
    },
  }
}

async function applyPlaceholderJobEffects(job) {
  const now = new Date().toISOString()
  const effects = []

  if (job.job_type === 'send_confirmation_sms') {
    effects.push(
      supabase
        .from('notification_queue')
        .update({ notification_status: 'sent', sent_at: now, updated_at: now })
        .eq('applicant_id', job.applicant_id)
        .eq('channel', 'sms')
        .eq('notification_status', 'queued'),
    )
  }

  if (job.job_type === 'send_confirmation_email' || job.job_type === 'send_ai_assessment') {
    effects.push(
      supabase
        .from('notification_queue')
        .update({ notification_status: 'sent', sent_at: now, updated_at: now })
        .eq('applicant_id', job.applicant_id)
        .eq('channel', 'email')
        .eq('notification_status', 'queued'),
    )
  }

  if (job.job_type === 'parse_resume') {
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: 'Resume Screened',
          status: 'Qualified',
          updated_at: now,
        })
        .eq('id', job.applicant_id)
        .eq('current_stage', 'New Applicant'),
    )
    effects.push(
      supabase
        .from('pipeline_stage_history')
        .insert({
          applicant_id: job.applicant_id,
          from_stage: 'New Applicant',
          to_stage: 'Resume Screened',
          changed_by: 'automation_processor',
          reason: 'Placeholder resume parsing completed.',
        }),
    )
  }

  if (job.job_type === 'evaluate_ai_assessment') {
    effects.push(
      supabase
        .from('ai_screening_tasks')
        .update({
          task_status: 'completed',
          ai_summary: 'Placeholder AI screening found solid role fit, professional communication, and workable availability. Review risk flags before advancing.',
          role_fit_score: 84,
          professionalism_score: 86,
          communication_score: 82,
          availability_score: 80,
          risk_flags: [],
          recommendation: 'Qualified',
          completed_at: now,
          updated_at: now,
        })
        .eq('applicant_id', job.applicant_id)
        .in('task_status', ['queued', 'running']),
    )
    effects.push(
      supabase
        .from('candidate_scores')
        .update({
          screening_score: 84,
          overall_candidate_score: 86,
          updated_at: now,
        })
        .eq('applicant_id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('ai_recommendations')
        .update({
          recommendation: 'Qualified',
          confidence: 86,
          summary: 'Placeholder AI screening indicates the candidate is qualified for HR review, pending compliance and interview steps.',
          risk_flags: [],
          updated_at: now,
        })
        .eq('applicant_id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: 'Assessment Completed',
          status: 'Qualified',
          updated_at: now,
        })
        .eq('id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('pipeline_stage_history')
        .insert({
          applicant_id: job.applicant_id,
          from_stage: job.applicants?.current_stage ?? null,
          to_stage: 'Assessment Completed',
          changed_by: 'automation_processor',
          reason: 'Placeholder AI screening evaluation completed.',
        }),
    )
  }

  if (job.job_type === 'verify_license') {
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: 'License Verified',
          license_status: 'Verified',
          status: 'Qualified',
          updated_at: now,
        })
        .eq('id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('pipeline_stage_history')
        .insert({
          applicant_id: job.applicant_id,
          from_stage: job.applicants?.current_stage ?? null,
          to_stage: 'License Verified',
          changed_by: 'automation_processor',
          reason: 'Placeholder license verification completed.',
        }),
    )
  }

  if (job.job_type === 'voice_interview_analysis') {
    const voiceScore = 88
    effects.push(
      supabase
        .from('voice_interviews')
        .insert({
          applicant_id: job.applicant_id,
          provider: 'voice_ai_placeholder',
          recording_url: 'https://example.com/voice-interview-placeholder',
          transcript: 'Placeholder voice interview completed. Candidate communicated clearly, confirmed availability, and gave professional responses suitable for final HR review.',
          score: voiceScore,
          recommendation: 'Proceed to final in-person interview',
          status: 'Complete',
          completed_at: now,
        }),
    )
    effects.push(
      supabase
        .from('candidate_scores')
        .update({
          voice_interview_score: voiceScore,
          overall_candidate_score: voiceScore,
          updated_at: now,
        })
        .eq('applicant_id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: 'Voice Interview Complete',
          interview_status: 'Complete',
          status: 'Qualified',
          updated_at: now,
        })
        .eq('id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('pipeline_stage_history')
        .insert({
          applicant_id: job.applicant_id,
          from_stage: job.applicants?.current_stage ?? null,
          to_stage: 'Voice Interview Complete',
          changed_by: 'automation_processor',
          reason: 'Placeholder voice interview analysis completed automatically.',
        }),
    )
  }

  if (job.job_type === 'send_scheduling_link') {
    const calendarSettings = await fetchCalendarSettings()
    const calendarProvider = calendarProviderKey(calendarSettings.provider)
    const scheduledFor = scheduledDateFromCalendarSettings(calendarSettings)
    const placementMatches = await generatePlacementMatches(job.applicant_id)
    effects.push(
      insertInterviewSchedule({
        applicant_id: job.applicant_id,
        provider: calendarProvider,
        scheduled_for: scheduledFor,
        scheduling_url: 'https://cal.com/viankax/final-interview-placeholder',
        status: 'Scheduled',
        external_calendar_provider: calendarProvider === 'internal_calendar' ? null : calendarSettings.provider,
        sync_status: calendarProvider === 'internal_calendar' ? 'Not Connected' : 'Ready to sync',
        interviewer_email: calendarSettings.interviewerEmail,
        interview_duration_minutes: Number(calendarSettings.interviewDuration),
        buffer_minutes: Number(calendarSettings.bufferTime),
        updated_at: now,
      }),
    )
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: 'Ready for Review',
          interview_status: 'Scheduled',
          status: 'Qualified',
          updated_at: now,
        })
        .eq('id', job.applicant_id),
    )
    effects.push(
      supabase
        .from('pipeline_stage_history')
        .insert({
          applicant_id: job.applicant_id,
          from_stage: job.applicants?.current_stage ?? null,
          to_stage: 'Ready for Review',
          changed_by: 'automation_processor',
          reason: 'Final in-person interview was scheduled and AI placement matches were generated automatically.',
        }),
    )
    if (placementMatches.length) {
      effects.push(supabase.from('placement_matches').insert(placementMatches))
    }
  }

  effects.push(supabase.from('automation_events').insert(processedEventForJob(job)))

  const results = await Promise.all(effects)
  const effectError = results.find((result) => result.error)?.error
  if (effectError) throw effectError
}

async function generatePlacementMatches(applicantId) {
  const [{ data: applicant }, { data: shifts, error: shiftsError }] = await Promise.all([
    supabase
      .from('applicants')
      .select(`
        id,
        job_id,
        site_id,
        open_shift_id,
        license_status,
        ai_screening_tasks(candidate_context),
        candidate_scores(screening_score, voice_interview_score, overall_candidate_score)
      `)
      .eq('id', applicantId)
      .single(),
    supabase
      .from('open_shifts')
      .select('*, job_sites(*)')
      .eq('status', 'Open'),
  ])

  if (shiftsError) throw shiftsError
  const signals = applicant?.ai_screening_tasks?.[0]?.candidate_context?.placementSignals ?? {}
  const scores = applicant?.candidate_scores?.[0] ?? {}
  const shiftTypes = normalizedList(signals.shiftTypes)
  const availableDays = normalizedList(signals.availableDays)
  const traits = normalizedList(signals.traits)
  const licenseType = String(signals.licenseType ?? '').toLowerCase()
  const baseScore = Math.round(((scores.screening_score ?? 75) + (scores.voice_interview_score ?? scores.overall_candidate_score ?? 75)) / 2)

  return (shifts ?? [])
    .map((shift) => {
      let matchScore = Math.min(96, Math.max(45, baseScore))
      const strengths = []
      const concerns = []
      const requiredLicense = String(shift.required_license_type ?? '').toLowerCase()

      if (applicant?.open_shift_id === shift.id) {
        matchScore += 8
        strengths.push('Applied directly to this open shift')
      }
      if (licenseType && requiredLicense && (licenseType === requiredLicense || (requiredLicense === 'so' && ['so', 'unarmed'].includes(licenseType)))) {
        matchScore += 8
        strengths.push(`License aligns with ${shift.required_license_type} requirement`)
      } else if (requiredLicense) {
        matchScore -= 12
        concerns.push(`Review ${shift.required_license_type} license requirement`)
      }
      if (shiftTypes.includes(shift.shift_type)) {
        matchScore += 7
        strengths.push(`${shift.shift_type} availability`)
      } else if (shiftTypes.includes('Flexible')) {
        matchScore += 5
        strengths.push('Flexible shift availability')
      } else {
        matchScore -= 6
        concerns.push(`${shift.shift_type} shift availability not confirmed`)
      }

      const dayOverlap = normalizedList(shift.days_needed).filter((day) => availableDays.includes(day)).length
      if (dayOverlap) {
        matchScore += Math.min(8, dayOverlap * 2)
        strengths.push('Available on needed days')
      } else {
        matchScore -= 4
        concerns.push('Confirm day-of-week availability')
      }

      const requiredTraits = normalizedList(shift.required_traits)
      const matchingTraits = requiredTraits.filter((trait) => traits.includes(trait))
      if (matchingTraits.length) {
        matchScore += Math.min(10, matchingTraits.length * 4)
        strengths.push(...matchingTraits)
      }

      matchScore = Math.max(35, Math.min(98, matchScore))

      return {
        applicant_id: applicantId,
        site_id: shift.site_id,
        open_shift_id: shift.id,
        job_id: applicant?.job_id ?? null,
        match_score: matchScore,
        recommendation_reason: `${shift.job_sites?.site_name ?? 'This site'} is a ${matchScore}% match based on license fit, shift availability, screening score, voice interview score, and site traits.`,
        strengths: [...new Set(strengths)].slice(0, 6),
        concerns: [...new Set(concerns)].slice(0, 4),
        match_status: 'Recommended',
        updated_at: new Date().toISOString(),
      }
    })
    .sort((first, second) => second.match_score - first.match_score)
    .slice(0, 4)
}

async function hasSubmittedAiAssessment(applicantId) {
  const { data, error } = await supabase
    .from('screening_answers')
    .select('id')
    .eq('applicant_id', applicantId)
    .eq('category', 'ai_assessment')
    .limit(1)

  if (error) throw error
  return Boolean(data?.length)
}

async function deferAiAssessmentEvaluation(job) {
  const nextCheckAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('automation_jobs')
    .update({
      job_status: 'queued',
      scheduled_for: nextCheckAt,
      last_error: 'Waiting for applicant to complete AI screening assessment.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  if (error) throw error
  await updateWorkflowAfterJob(job.workflow_run_id)

  return {
    processed: false,
    job: mapAutomationQueueJob({ ...job, job_status: 'queued', scheduled_for: nextCheckAt }),
    message: 'AI screening evaluation is waiting for applicant answers. The job was deferred.',
  }
}

async function deferAutomationJob(job, reason) {
  const nextCheckAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('automation_jobs')
    .update({
      job_status: 'queued',
      scheduled_for: nextCheckAt,
      last_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  if (error) throw error
  await updateWorkflowAfterJob(job.workflow_run_id)

  return {
    processed: false,
    job: mapAutomationQueueJob({ ...job, job_status: 'queued', scheduled_for: nextCheckAt }),
    message: `${job.job_label} is waiting. ${reason}`,
  }
}

async function processOrphanedEmailNotificationLocally() {
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('id, applicant_id, recipient, subject, message, metadata, created_at, applicants(full_name)')
    .eq('channel', 'email')
    .eq('notification_status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  const notification = notifications?.[0]

  if (!notification) {
    return {
      processed: false,
      message: 'No queued automation jobs or email notifications are ready to run.',
    }
  }

  const now = new Date().toISOString()
  const template = notification.metadata?.template ?? 'email_notification'
  const { error: notificationError } = await supabase
    .from('notification_queue')
    .update({
      notification_status: 'sent',
      sent_at: now,
      metadata: {
        ...(notification.metadata ?? {}),
        provider: 'local_placeholder',
        note: 'Recovered orphaned queued email notification with local placeholder processor.',
      },
      updated_at: now,
    })
    .eq('id', notification.id)

  if (notificationError) throw notificationError

  const { error: eventError } = await supabase
    .from('automation_events')
    .insert({
      applicant_id: notification.applicant_id,
      event_type: 'orphaned_email_notification_processed',
      event_status: 'complete',
      event_label: 'Queued Email Notification Processed',
      metadata: {
        notificationId: notification.id,
        template,
        provider: 'local_placeholder',
        description: 'Recovered an email notification that was queued without a ready automation job.',
      },
    })

  if (eventError) throw eventError

  return {
    processed: true,
    source: 'local-fallback',
    message: `Queued email notification sent for ${notification.applicants?.full_name ?? notification.recipient}.`,
  }
}

async function processNextAutomationJobLocally() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data: jobs, error } = await supabase
    .from('automation_jobs')
    .select(`
      id,
      applicant_id,
      workflow_run_id,
      job_type,
      job_label,
      job_status,
      priority,
      scheduled_for,
      attempts,
      last_error,
      payload,
      created_at,
      updated_at,
      applicants(full_name, current_stage, jobs(title))
    `)
    .eq('job_status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('scheduled_for', { ascending: true })
    .limit(1)

  if (error) throw error

  const job = jobs?.[0]
  if (!job) {
    return processOrphanedEmailNotificationLocally()
  }

  if (job.job_type === 'evaluate_ai_assessment' && !(await hasSubmittedAiAssessment(job.applicant_id))) {
    return deferAiAssessmentEvaluation(job)
  }

  if (
    ['voice_interview_analysis', 'send_scheduling_link'].includes(job.job_type) &&
    !(await hasSubmittedAiAssessment(job.applicant_id))
  ) {
    return deferAutomationJob(job, 'Waiting for applicant to complete AI screening assessment.')
  }

  const now = new Date().toISOString()
  const { error: runningError } = await supabase
    .from('automation_jobs')
    .update({
      job_status: 'running',
      attempts: (job.attempts ?? 0) + 1,
      updated_at: now,
    })
    .eq('id', job.id)

  if (runningError) throw runningError

  try {
    await applyPlaceholderJobEffects(job)

    const { error: completedError } = await supabase
      .from('automation_jobs')
      .update({
        job_status: 'completed',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (completedError) throw completedError
    await updateWorkflowAfterJob(job.workflow_run_id)

    return {
      processed: true,
      job: mapAutomationQueueJob({ ...job, job_status: 'completed', attempts: (job.attempts ?? 0) + 1 }),
      message: `${job.job_label} completed for ${job.applicants?.full_name ?? 'the applicant'}.`,
    }
  } catch (processError) {
    await supabase
      .from('automation_jobs')
      .update({
        job_status: 'failed',
        last_error: processError.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    await updateWorkflowAfterJob(job.workflow_run_id)
    throw processError
  }
}

async function processNextAutomationJobWithEdgeFunction() {
  const { data, error } = await supabase.functions.invoke('process-automation-jobs', {
    body: { mode: 'manual-debug-run', maxJobs: 10 },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return {
    processed: Boolean(data?.processed),
    message: data?.message ?? 'Automation function completed.',
    job: data?.job ?? data?.jobs?.[0] ?? data?.deferredJobs?.[0]?.job ?? null,
    jobs: data?.jobs ?? [],
    deferredJobs: data?.deferredJobs ?? [],
    source: 'edge-function',
  }
}

export async function processNextAutomationJob({ preferEdgeFunction = true } = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  if (preferEdgeFunction) {
    try {
      return await processNextAutomationJobWithEdgeFunction()
    } catch (edgeError) {
      const fallbackResult = await processNextAutomationJobLocally()
      return {
        ...fallbackResult,
        source: 'local-fallback',
        message: `${fallbackResult.message} Edge Function fallback used: ${edgeError.message}`,
      }
    }
  }

  return processNextAutomationJobLocally()
}

async function createWorkflowRun(applicantId, application) {
  const { data, error } = await supabase
    .from('workflow_runs')
    .insert({
      applicant_id: applicantId,
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

  if (error) throw error
  return data.id
}

function automationJobRows(applicantId, workflowRunId, application, uploadedDocuments) {
  const now = new Date()
  const scheduledNow = now.toISOString()
  const scheduledInFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

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
        payload: {
          reason: 'knockout_failed',
          flags: application.knockoutFlags ?? [],
        },
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
      scheduled_for: scheduledInFiveMinutes,
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
      job_status: uploadedDocuments.guardCard ? 'queued' : 'blocked',
      priority: 3,
      scheduled_for: scheduledNow,
      payload: { licenseUploaded: Boolean(uploadedDocuments.guardCard) },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'voice_interview_analysis',
      job_label: 'Analyze voice interview',
      job_status: 'queued',
      priority: 6,
      scheduled_for: scheduledNow,
      payload: { provider: 'voice_ai_placeholder', mode: 'automated_voice_screening' },
    },
    {
      applicant_id: applicantId,
      workflow_run_id: workflowRunId,
      job_type: 'send_scheduling_link',
      job_label: 'Schedule final in-person interview',
      job_status: 'queued',
      priority: 7,
      scheduled_for: scheduledNow,
      payload: { provider: 'calendar_placeholder', mode: 'auto_schedule_final_interview' },
    },
  ]
}

function findAutomationJobId(jobs, jobType) {
  return jobs.find((job) => job.job_type === jobType)?.id ?? null
}

function notificationRows(applicantId, application, automationJobs = []) {
  if (application.knockoutResult === 'Failed') return []

  const scheduledNow = new Date().toISOString()
  const aiAssessmentScheduledFor = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const assessmentUrl = appOrigin ? `${appOrigin}/screening/${applicantId}` : `/screening/${applicantId}`

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
      subject: 'Your application was received',
      message: 'Your application has been received. The hiring automation workflow will update your status as screening progresses.',
      notification_status: 'queued',
      scheduled_for: scheduledNow,
      metadata: { template: 'application_confirmation' },
    },
    {
      applicant_id: applicantId,
      automation_job_id: findAutomationJobId(automationJobs, 'send_ai_assessment'),
      channel: 'email',
      recipient: application.email,
      subject: 'Complete your ViankaX screening assessment',
      message: `Please complete your AI screening assessment so the hiring team can continue reviewing your application: ${assessmentUrl}`,
      notification_status: 'queued',
      scheduled_for: aiAssessmentScheduledFor,
      metadata: { template: 'ai_assessment_invite', assessmentUrl },
    },
  ]
}

function aiScreeningTaskRow(applicantId, application) {
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

function notificationKey(notification) {
  return `${notification.channel}:${notification.metadata?.template ?? notification.subject ?? notification.message}`
}

async function createAutomationJobs(applicantId, workflowRunId, application, uploadedDocuments) {
  const { data, error } = await supabase
    .from('automation_jobs')
    .insert(automationJobRows(applicantId, workflowRunId, application, uploadedDocuments))
    .select('id, job_type')

  if (error) throw error
  return data ?? []
}

async function ensureQueuedNotifications(applicantId, application, automationJobs) {
  const expectedNotifications = notificationRows(applicantId, application, automationJobs)
  if (!expectedNotifications.length) return []

  const { data: existingNotifications, error: existingError } = await supabase
    .from('notification_queue')
    .select('channel, subject, message, metadata')
    .eq('applicant_id', applicantId)

  if (existingError) throw existingError

  const existingKeys = new Set((existingNotifications ?? []).map(notificationKey))
  const missingNotifications = expectedNotifications.filter((notification) => !existingKeys.has(notificationKey(notification)))

  if (!missingNotifications.length) return expectedNotifications

  const { error: insertError } = await supabase
    .from('notification_queue')
    .insert(missingNotifications)

  if (insertError) throw insertError
  return expectedNotifications
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

  const applicantId = applicant.id
  const { uploadedDocuments, failedUploads } = await uploadApplicationDocuments(applicantId, uploadFiles)
  const failedUploadCount = Object.keys(failedUploads).length
  const workflowRunId = await createWorkflowRun(applicantId, application)
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

  const automationJobs = await createAutomationJobs(applicantId, workflowRunId, application, uploadedDocuments)
  await ensureQueuedNotifications(applicantId, application, automationJobs)

  const writeOperations = [
    supabase.from('candidate_scores').insert(scoreRow),
    supabase.from('ai_recommendations').insert(recommendationRow),
    supabase.from('automation_events').insert(automationEventRows),
    supabase.from('ai_screening_tasks').insert(aiScreeningTaskRow(applicantId, application)),
    supabase.from('screening_answers').insert(screeningRows),
    supabase.from('applicant_documents').insert(documentRowsFromApplication(applicantId, application, uploadedDocuments, failedUploads)),
  ]

  const results = await Promise.all(writeOperations)
  const writeError = results.find((result) => result.error)?.error
  if (writeError) throw writeError

  return {
    ok: true,
    applicantId,
    warning: failedUploadCount
      ? 'Application was saved and automation was queued, but one or more document uploads failed.'
      : null,
  }
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
