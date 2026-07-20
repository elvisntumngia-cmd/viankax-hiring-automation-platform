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

const demoAutomationDelays = {
  aiAssessmentInviteMs: 15 * 1000,
  deferredRetryMs: 15 * 1000,
}

const candidateEmailJobTypes = [
  'send_confirmation_email',
  'send_ai_assessment',
  'send_screening_complete_email',
  'send_final_candidate_email',
  'send_candidate_followup_email',
]

export const defaultCalendarSettings = {
  provider: 'Internal calendar',
  interviewerEmail: 'hr@viankax.com',
  interviewDuration: '30',
  bufferTime: '15',
  schedulingWindow: '3 business days after voice interview',
  businessHoursStart: '09:00',
  businessHoursEnd: '17:00',
  allowWeekends: false,
  maxInterviewsPerDay: '6',
  googleConnectionStatus: 'Not connected',
  microsoftConnectionStatus: 'Not connected',
}

function mapCalendarSettings(row) {
  if (!row) return defaultCalendarSettings

  return {
    provider: row.provider ?? defaultCalendarSettings.provider,
    interviewerEmail: row.interviewer_email ?? defaultCalendarSettings.interviewerEmail,
    interviewDuration: String(row.interview_duration_minutes ?? defaultCalendarSettings.interviewDuration),
    bufferTime: String(row.buffer_minutes ?? defaultCalendarSettings.bufferTime),
    schedulingWindow: row.scheduling_window ?? defaultCalendarSettings.schedulingWindow,
    businessHoursStart: row.business_hours_start ?? defaultCalendarSettings.businessHoursStart,
    businessHoursEnd: row.business_hours_end ?? defaultCalendarSettings.businessHoursEnd,
    allowWeekends: row.allow_weekends ?? defaultCalendarSettings.allowWeekends,
    maxInterviewsPerDay: String(row.max_interviews_per_day ?? defaultCalendarSettings.maxInterviewsPerDay),
    googleConnectionStatus: row.google_connection_status ?? defaultCalendarSettings.googleConnectionStatus,
    microsoftConnectionStatus: row.microsoft_connection_status ?? defaultCalendarSettings.microsoftConnectionStatus,
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

async function uploadApplicationDocuments(applicantId, uploadFiles = {}) {
  const uploadedDocuments = {}
  const failedUploads = {}

  for (const definition of documentDefinitions) {
    const file = uploadFiles[definition.key]

    if (file) {
      const { data: signedUpload, error: signingError } = await supabase.functions.invoke('create-applicant-upload-url', {
        body: {
          applicantId,
          documentKey: definition.key,
          fileName: file.name,
          fileSize: file.size,
        },
      })

      if (signingError || signedUpload?.error) {
        failedUploads[definition.statusKey] = signedUpload?.error ?? signingError?.message ?? 'Unable to prepare upload.'
        continue
      }

      const { error } = await supabase.storage
        .from(signedUpload.bucket)
        .uploadToSignedUrl(signedUpload.path, signedUpload.token, file)

      if (error) {
        failedUploads[definition.statusKey] = error.message
        continue
      }

      uploadedDocuments[definition.statusKey] = {
        fileName: file.name,
        storageBucket: signedUpload.bucket,
        storagePath: signedUpload.path,
        status: 'Uploaded',
      }
    }
  }

  return { uploadedDocuments, failedUploads }
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
  const voiceInterview = [...(row.voice_interviews ?? [])].sort((first, second) => {
    const firstRank = first.provider === 'vapi' && first.provider_call_id ? 2 : first.provider_call_id ? 1 : 0
    const secondRank = second.provider === 'vapi' && second.provider_call_id ? 2 : second.provider_call_id ? 1 : 0
    if (firstRank !== secondRank) return secondRank - firstRank
    const firstTime = new Date(first.updated_at ?? first.completed_at ?? first.created_at ?? 0).getTime()
    const secondTime = new Date(second.updated_at ?? second.completed_at ?? second.created_at ?? 0).getTime()
    return secondTime - firstTime
  })[0] ?? {}
  const interviewSchedule = row.interview_schedules?.[0] ?? {}
  const hasScheduledInterview =
    row.interview_status === 'Scheduled' ||
    ['Interview Scheduled', 'Ready for Review'].includes(row.current_stage)
  const placementMatches = mapPlacementMatches(row.placement_matches)
  const job = row.jobs ?? {}
  const client = row.clients ?? job.clients ?? {}
  const assignedSite = row.assigned_site ? mapJobSite({ ...row.assigned_site, open_shifts: [] }) : null
  const assignedShift = row.assigned_shift ? mapOpenShift(row.assigned_shift) : null
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
    siteId: row.site_id ?? null,
    openShiftId: row.open_shift_id ?? null,
    assignedSite,
    assignedShift,
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
      provider: voiceInterview.provider ?? null,
      providerCallId: voiceInterview.provider_call_id ?? null,
      interviewUrl: voiceInterview.interview_url ?? null,
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
        bestMatch: placementMatches[0].site?.siteName ?? placementMatches[0].shift?.shiftTitle ?? 'Placement match pending',
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
    business_hours_start: settings.businessHoursStart,
    business_hours_end: settings.businessHoursEnd,
    allow_weekends: Boolean(settings.allowWeekends),
    max_interviews_per_day: Number(settings.maxInterviewsPerDay),
    google_connection_status: settings.googleConnectionStatus,
    microsoft_connection_status: settings.microsoftConnectionStatus,
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

export async function updateInterviewSchedule(applicantId, updates) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.')

  const row = {
    updated_at: new Date().toISOString(),
  }

  if (updates.status) row.status = updates.status
  if (updates.scheduledFor) row.scheduled_for = updates.scheduledFor
  if (updates.syncStatus) row.sync_status = updates.syncStatus
  if (updates.syncError !== undefined) row.sync_error = updates.syncError

  const { data, error } = await supabase
    .from('interview_schedules')
    .update(row)
    .eq('applicant_id', applicantId)
    .select('*')
    .maybeSingle()

  if (error) throw error

  await supabase.from('calendar_sync_logs').insert({
    applicant_id: applicantId,
    provider: updates.provider ?? 'internal_calendar',
    action: updates.status === 'Canceled' ? 'cancel' : updates.status === 'Rescheduled' ? 'reschedule' : 'update',
    sync_status: updates.syncStatus ?? 'Updated',
    message: updates.message ?? 'Interview schedule updated from HR calendar.',
  })

  return data
}

export async function startCalendarOAuth(provider) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.functions.invoke('calendar-oauth-start', {
    body: {
      provider,
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard/calendar` : undefined,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function syncPendingCalendarEvents() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
    body: { mode: 'manual-sync' },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function disconnectCalendarProvider(provider) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.functions.invoke('calendar-disconnect', {
    body: { provider },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
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
      assigned_site:job_sites!applicants_site_id_fkey(*),
      assigned_shift:open_shifts!applicants_open_shift_id_fkey(*, job_sites(site_name)),
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
      voice_interviews(provider, provider_call_id, interview_url, recording_url, score, transcript, recommendation, status, completed_at, created_at, updated_at),
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

  const { data, error } = await supabase.functions.invoke('applicant-workflow', {
    body: {
      action: 'lookup_status',
      email,
      phone,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data?.applicant ? mapApplicant(data.applicant) : null
}

export async function fetchApplicantForScreening(applicantId) {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase.functions.invoke('applicant-workflow', {
    body: {
      action: 'fetch_applicant',
      applicantId,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data?.applicant ? mapApplicant(data.applicant) : null
}

function normalizedList(value) {
  return Array.isArray(value) ? value : value ? [value] : []
}

export async function submitAiScreeningAssessment(applicantId, answers) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.functions.invoke('applicant-workflow', {
    body: {
      action: 'submit_ai_screening',
      applicantId,
      answers,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function triggerVoiceInterview(applicantId) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.functions.invoke('applicant-workflow', {
    body: {
      action: 'trigger_voice_interview',
      applicantId,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
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
    send_confirmation_email: ['application_screening_email_sent', 'Application & Screening Email Sent', 'Candidate received application confirmation and screening invitation.'],
    parse_resume: ['resume_screened', 'Resume Screened', 'Placeholder resume parsing completed and candidate moved forward.'],
    send_ai_assessment: ['ai_assessment_sent', 'AI Assessment Sent', 'AI screening assessment invite job completed.'],
    send_screening_complete_email: ['screening_complete_email_sent', 'Screening Complete Email Sent', 'Candidate received the voice interview trigger link.'],
    evaluate_ai_assessment: ['ai_screening_evaluated', 'AI Screening Evaluated', 'Placeholder AI screening evaluation generated structured candidate scores.'],
    verify_license: ['license_verification_completed', 'License Verification Completed', 'Placeholder license verification completed.'],
    send_scheduling_link: ['scheduling_link_sent', 'Scheduling Link Sent', 'Placeholder scheduling link was marked as sent.'],
    send_final_candidate_email: ['final_candidate_email_sent', 'Final Candidate Email Sent', 'Candidate received final interview or follow-up instructions.'],
    send_candidate_followup_email: ['candidate_followup_email_sent', 'Candidate Follow-up Email Sent', 'Candidate received post-voice follow-up instructions.'],
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

  if (candidateEmailJobTypes.includes(job.job_type)) {
    effects.push(
      supabase
        .from('notification_queue')
        .update({ notification_status: 'sent', sent_at: now, updated_at: now })
        .eq('applicant_id', job.applicant_id)
        .eq('channel', 'email')
        .eq('automation_job_id', job.id)
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
  const nextCheckAt = new Date(Date.now() + demoAutomationDelays.deferredRetryMs).toISOString()
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
  const nextCheckAt = new Date(Date.now() + demoAutomationDelays.deferredRetryMs).toISOString()
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
    body: { mode: 'manual-debug-run', maxJobs: 1 },
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

async function kickAutomationRunner(mode, maxJobs = 1) {
  if (!isSupabaseConfigured) return null

  try {
    const { data, error } = await supabase.functions.invoke('process-automation-jobs', {
      body: { mode, maxJobs },
    })

    return error
      ? { ok: false, message: error.message }
      : { ok: true, message: data?.message ?? 'Automation runner kicked.', data }
  } catch (error) {
    return { ok: false, message: error.message }
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

export async function submitApplicationToSupabase(application, uploadFiles = {}) {
  if (!isSupabaseConfigured) {
    return { ok: false, error: new Error('Supabase is not configured.') }
  }

  const applicantId = crypto.randomUUID()
  const { uploadedDocuments, failedUploads } = await uploadApplicationDocuments(applicantId, uploadFiles)

  const { data: submission, error: submissionError } = await supabase.functions.invoke('public-application-submit', {
    body: {
      applicantId,
      application,
      uploadedDocuments,
      failedUploads,
    },
  })

  if (submissionError) throw submissionError
  if (submission?.error) throw new Error(submission.error)

  const automationKickoff = await kickAutomationRunner('application-submitted-kickoff', 3)

  return {
    ok: true,
    applicantId: submission?.applicantId ?? applicantId,
    automationKickoff,
    warning: submission?.warning ?? null,
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

export async function assignApplicantToPlacement(applicant, placement) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  if (!isUuid(applicant.id)) {
    throw new Error('Only Supabase applicant records can be assigned.')
  }

  const siteId = placement?.site?.id ?? placement?.bestSite?.id ?? null
  const openShiftId = placement?.shift?.id ?? placement?.bestShift?.id ?? placement?.shiftId ?? null

  if (!isUuid(siteId) || !isUuid(openShiftId)) {
    throw new Error('This placement match is demo-only. Use a Supabase-generated placement match before assigning.')
  }

  const nextStage = 'Hired'
  const now = new Date().toISOString()

  const { error: applicantError } = await supabase
    .from('applicants')
    .update({
      site_id: siteId,
      open_shift_id: openShiftId,
      current_stage: nextStage,
      status: 'Qualified',
      final_decision: 'Assigned',
      updated_at: now,
    })
    .eq('id', applicant.id)

  if (applicantError) throw applicantError

  const currentOpenPositions = Number(placement?.shift?.openPositions ?? placement?.bestShift?.openPositions)
  const nextOpenPositions = Number.isFinite(currentOpenPositions)
    ? Math.max(currentOpenPositions - 1, 0)
    : null

  if (nextOpenPositions !== null) {
    const { error: shiftError } = await supabase
      .from('open_shifts')
      .update({
        open_positions: nextOpenPositions,
        status: nextOpenPositions === 0 ? 'Filled' : 'Open',
        updated_at: now,
      })
      .eq('id', openShiftId)

    if (shiftError) throw shiftError
  }

  const historyRow = {
    applicant_id: applicant.id,
    from_stage: applicant.stage,
    to_stage: nextStage,
    changed_by: 'hr_dashboard',
    reason: 'HR assigned candidate to the recommended site/open shift.',
  }
  const eventRow = {
    applicant_id: applicant.id,
    event_type: 'hr_assigned_candidate_to_site',
    event_status: 'complete',
    event_label: 'HR Assigned Candidate',
    metadata: {
      siteId,
      openShiftId,
      fromStage: applicant.stage,
      toStage: nextStage,
      description: 'Candidate assigned to recommended placement and marked hired.',
    },
  }

  const [{ error: historyError }, { error: eventError }] = await Promise.all([
    supabase.from('pipeline_stage_history').insert(historyRow),
    supabase.from('automation_events').insert(eventRow),
  ])

  if (historyError) throw historyError
  if (eventError) throw eventError

  return {
    siteId,
    openShiftId,
    assignedSite: placement.site ?? placement.bestSite,
    assignedShift: placement.shift ?? placement.bestShift,
    stage: nextStage,
    status: 'Qualified',
    decision: 'Assigned',
    latestEvent: {
      type: eventRow.event_type,
      status: eventRow.event_status,
      label: eventRow.event_label,
      description: eventRow.metadata.description,
      createdAt: now,
    },
    automationEvents: [
      {
        type: eventRow.event_type,
        status: eventRow.event_status,
        label: eventRow.event_label,
        description: eventRow.metadata.description,
        createdAt: now,
      },
      ...(applicant.automationEvents ?? []),
    ],
    stageHistory: [
      {
        fromStage: historyRow.from_stage,
        toStage: historyRow.to_stage,
        changedBy: historyRow.changed_by,
        reason: historyRow.reason,
        createdAt: now,
      },
      ...(applicant.stageHistory ?? []),
    ],
    lastUpdatedAt: now,
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
