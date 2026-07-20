import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const applicantSelect = `
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
`

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ''))
}

function appBaseUrl() {
  return (Deno.env.get('APP_BASE_URL') ?? Deno.env.get('PUBLIC_APP_URL') ?? '').replace(/\/$/, '')
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(String) : []
}

function scoreAssessmentAnswers(answers: Record<string, any>, applicant: Record<string, any>) {
  const shiftTypes = list(answers.shiftTypes)
  const availableDays = list(answers.availableDays)
  const environmentsWorked = list(answers.environments)
  const shortResponses = [answers.interestReason, answers.preferredSecurityWork, answers.reliabilityReason].map(text)
  const responseLength = shortResponses.join(' ').length
  const knockoutConcerns = [
    answers.authorizedToWork === 'No' ? 'Not authorized to work in the United States' : null,
    answers.backgroundCheck === 'No' ? 'Not willing to undergo background check' : null,
    answers.reliableTransportation === 'No' ? 'No reliable transportation' : null,
  ].filter(Boolean)

  const eligibilityScore = Math.max(0, 100 - knockoutConcerns.length * 35 - (answers.hasSecurityLicense === 'No' ? 12 : 0))
  const availabilityScore = Math.min(100, 45 + shiftTypes.length * 9 + availableDays.length * 4 + (answers.weekendHolidayOvertime === 'Yes' ? 12 : 0))
  const transportationScore = answers.reliableTransportation === 'Yes' ? 100 : 20
  const experienceMap: Record<string, number> = {
    'No experience': 42,
    'Less than 1 year': 58,
    '1-2 years': 72,
    '3-5 years': 86,
    '5+ years': 95,
  }
  const experienceScore = Math.min(100, (experienceMap[answers.yearsExperience] ?? 55) + Math.min(12, environmentsWorked.length * 3))
  const siteReadinessScore = Math.round([
    answers.standingWalking,
    answers.outdoorWork,
    answers.workingAlone,
    answers.digitalReportingTools,
    answers.incidentReporting,
  ].filter((answer) => answer === 'Yes').length * 18 + 10)
  const communicationScore = Math.max(35, Math.min(100, 45 + Math.floor(responseLength / 18)))
  const screeningScore = Math.round(
    eligibilityScore * 0.22 +
    availabilityScore * 0.16 +
    transportationScore * 0.16 +
    experienceScore * 0.18 +
    siteReadinessScore * 0.14 +
    communicationScore * 0.14,
  )

  const recommendation = knockoutConcerns.length
    ? 'Not Recommended'
    : screeningScore >= 85
      ? 'Strong Candidate'
      : screeningScore >= 72
        ? 'Moderate Candidate'
        : screeningScore >= 58
          ? 'Needs Review'
          : 'Not Recommended'

  const strengths = [
    answers.hasSecurityLicense === 'Yes' ? `Valid ${answers.licenseType || 'security'} license` : null,
    answers.reliableTransportation === 'Yes' ? 'Reliable transportation' : null,
    shiftTypes.includes('Flexible') ? 'Flexible availability' : null,
    availableDays.includes('Saturday') || availableDays.includes('Sunday') ? 'Weekend availability' : null,
    environmentsWorked.length ? `${environmentsWorked.slice(0, 2).join(', ')} experience` : null,
    answers.incidentReporting === 'Yes' ? 'Incident reporting experience' : null,
    answers.digitalReportingTools === 'Yes' ? 'Comfortable with digital reporting tools' : null,
  ].filter(Boolean)

  const concerns = [
    answers.hasSecurityLicense === 'No' ? 'No current security license or guard card' : null,
    answers.incidentReporting === 'No' ? 'Incident reporting experience not confirmed' : null,
    answers.supervisedTeam === 'No' ? 'No supervisory experience' : null,
    communicationScore < 65 ? 'Written response quality needs review' : null,
    ...knockoutConcerns,
  ].filter(Boolean)

  const suggestedNextStep = recommendation === 'Strong Candidate'
    ? 'Proceed to voice interview'
    : recommendation === 'Moderate Candidate'
      ? 'Proceed to voice interview'
      : recommendation === 'Needs Review'
        ? 'Hold for HR review'
        : 'Reject'

  return {
    eligibilityScore,
    availabilityScore,
    transportationScore,
    experienceScore,
    siteReadinessScore,
    communicationScore,
    roleFitScore: Math.round((experienceScore + availabilityScore + siteReadinessScore) / 3),
    professionalismScore: communicationScore,
    screeningScore,
    recommendation,
    suggestedNextStep,
    strengths: [...new Set(strengths)].slice(0, 6),
    concerns: [...new Set(concerns)].slice(0, 6),
    riskFlags: knockoutConcerns,
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
    applicantSnapshot: {
      jobTitle: applicant.jobs?.title ?? null,
      currentStage: applicant.current_stage ?? null,
    },
  }
}

const answerLabels: Record<string, string> = {
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

async function fetchApplicant(supabase: ReturnType<typeof createClient>, applicantId: string) {
  const { data, error } = await supabase
    .from('applicants')
    .select(applicantSelect)
    .eq('id', applicantId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function handleFetchApplicant(supabase: ReturnType<typeof createClient>, body: Record<string, any>) {
  if (!isUuid(body.applicantId)) return jsonResponse({ error: 'A valid applicant ID is required.' }, 400)
  const applicant = await fetchApplicant(supabase, body.applicantId)
  return jsonResponse({ applicant: applicant ?? null })
}

async function handleLookupStatus(supabase: ReturnType<typeof createClient>, body: Record<string, any>) {
  let query = supabase
    .from('applicants')
    .select(applicantSelect)
    .order('submitted_at', { ascending: false })
    .limit(1)

  if (body.email) query = query.ilike('email', text(body.email))
  if (body.phone) query = query.eq('phone', text(body.phone))

  const { data, error } = await query
  if (error) throw error
  return jsonResponse({ applicant: data?.[0] ?? null })
}

async function handleSubmitScreening(supabase: ReturnType<typeof createClient>, body: Record<string, any>) {
  const applicantId = body.applicantId
  const answers = body.answers ?? {}

  if (!isUuid(applicantId)) return jsonResponse({ error: 'A valid applicant ID is required.' }, 400)

  const applicant = await fetchApplicant(supabase, applicantId)
  if (!applicant) return jsonResponse({ error: 'Applicant not found.' }, 404)

  const now = new Date().toISOString()
  const scores = scoreAssessmentAnswers(answers, applicant)
  const shouldStartVoiceInterview = ['Strong Candidate', 'Moderate Candidate'].includes(scores.recommendation) &&
    !['Hold for HR review', 'Reject'].includes(scores.suggestedNextStep)
  const voiceUrl = appBaseUrl() ? `${appBaseUrl()}/voice/${applicantId}` : `/voice/${applicantId}`

  const { data: screeningEmailJob, error: screeningEmailJobError } = await supabase
    .from('automation_jobs')
    .select('id')
    .eq('applicant_id', applicantId)
    .eq('job_type', 'send_screening_complete_email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (screeningEmailJobError) throw screeningEmailJobError

  const answerRows = Object.entries(answers).map(([question, answer]) => ({
    applicant_id: applicantId,
    question: answerLabels[question] ?? question,
    answer: Array.isArray(answer) ? answer.join(', ') : String(answer ?? ''),
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
        overall_candidate_score: Math.round((scores.screeningScore + (applicant.candidate_scores?.[0]?.resume_score ?? scores.screeningScore)) / 2),
        updated_at: now,
      }, { onConflict: 'applicant_id' }),
    supabase
      .from('ai_recommendations')
      .upsert({
        applicant_id: applicantId,
        recommendation: scores.recommendation,
        confidence: scores.screeningScore,
        summary: aiSummary,
        risk_flags: scores.riskFlags,
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
      .from('automation_jobs')
      .update({
        job_status: shouldStartVoiceInterview ? 'blocked' : 'blocked',
        scheduled_for: now,
        last_error: shouldStartVoiceInterview
          ? 'Waiting for candidate to trigger voice interview from email link.'
          : `AI screening recommended: ${scores.suggestedNextStep}.`,
        updated_at: now,
      })
      .eq('applicant_id', applicantId)
      .eq('job_type', 'voice_interview_analysis')
      .in('job_status', ['blocked', 'queued', 'running', 'failed']),
    supabase
      .from('automation_jobs')
      .update({
        job_status: 'queued',
        scheduled_for: now,
        last_error: null,
        updated_at: now,
      })
      .eq('applicant_id', applicantId)
      .eq('job_type', 'send_screening_complete_email')
      .in('job_status', ['blocked', 'queued', 'running', 'failed']),
    supabase
      .from('notification_queue')
      .insert({
        applicant_id: applicantId,
        automation_job_id: screeningEmailJob?.id ?? null,
        channel: 'email',
        recipient: applicant.email,
        subject: 'Your ViankaX screening is complete',
        message: shouldStartVoiceInterview
          ? `Your AI screening is complete. Please trigger your voice interview when you are ready: ${voiceUrl}`
          : 'Your AI screening is complete. Our hiring team will review your application and follow up with next steps.',
        notification_status: 'queued',
        scheduled_for: now,
        metadata: {
          template: 'screening_complete_voice_trigger',
          voiceUrl: shouldStartVoiceInterview ? voiceUrl : null,
          screeningScore: scores.screeningScore,
          recommendation: scores.recommendation,
          suggestedNextStep: scores.suggestedNextStep,
        },
      }),
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
        from_stage: applicant.current_stage ?? 'New Applicant',
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

  let automationKickoff
  try {
    const { data, error } = await supabase.functions.invoke('process-automation-jobs', {
      body: { mode: 'ai-screening-submit-email-kickoff', maxJobs: 3 },
    })

    automationKickoff = error
      ? { ok: false, message: error.message }
      : { ok: true, message: data?.message ?? 'Screening completion email kickoff requested.', data }
  } catch (kickoffError) {
    automationKickoff = { ok: false, message: errorMessage(kickoffError) }
  }

  return jsonResponse({
    ok: true,
    scores,
    summary: aiSummary,
    automationKickoff,
  })
}

async function handleTriggerVoice(supabase: ReturnType<typeof createClient>, body: Record<string, any>) {
  const applicantId = body.applicantId
  if (!isUuid(applicantId)) return jsonResponse({ error: 'A valid applicant ID is required.' }, 400)

  const now = new Date().toISOString()
  const { data: jobs, error: jobError } = await supabase
    .from('automation_jobs')
    .select('id, job_status')
    .eq('applicant_id', applicantId)
    .eq('job_type', 'voice_interview_analysis')
    .order('created_at', { ascending: false })
    .limit(1)

  if (jobError) throw jobError
  const job = jobs?.[0]
  if (!job) return jsonResponse({ error: 'No voice interview automation job was found for this applicant.' }, 404)

  const { data: existingVoiceInterview, error: existingVoiceError } = await supabase
    .from('voice_interviews')
    .select('id, provider_call_id, status')
    .eq('applicant_id', applicantId)
    .eq('provider', 'vapi')
    .not('provider_call_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingVoiceError) throw existingVoiceError
  if (existingVoiceInterview?.provider_call_id) {
    return jsonResponse({
      ok: true,
      alreadyStarted: true,
      message: 'Your voice interview has already been started. Please answer or check your recent calls.',
      voiceInterview: existingVoiceInterview,
    })
  }

  const { error: updateError } = await supabase
    .from('automation_jobs')
    .update({
      job_status: 'queued',
      scheduled_for: now,
      attempts: 0,
      last_error: null,
      payload: { provider: 'vapi', mode: 'candidate_triggered_voice_interview' },
      updated_at: now,
    })
    .eq('id', job.id)
    .in('job_status', ['blocked', 'queued', 'failed', 'running'])

  if (updateError) throw updateError

  const { error: eventError } = await supabase
    .from('automation_events')
    .insert({
      applicant_id: applicantId,
      event_type: 'candidate_triggered_voice_interview',
      event_status: 'complete',
      event_label: 'Candidate Triggered Voice Interview',
      metadata: {
        description: 'Candidate clicked the voice interview link from the screening completion email.',
        automationJobId: job.id,
      },
    })

  if (eventError) throw eventError

  const { data, error } = await supabase.functions.invoke('process-automation-jobs', {
    body: { mode: 'candidate-triggered-voice-interview', maxJobs: 3 },
  })

  if (error) return jsonResponse({ ok: false, message: error.message })

  return jsonResponse({
    ok: true,
    message: data?.message ?? 'Voice interview call requested. Please keep your phone nearby.',
    data,
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase service role is not configured.' }, 500)
    }

    const body = await request.json().catch(() => ({}))
    const action = String(body?.action ?? '')
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (action === 'fetch_applicant') return handleFetchApplicant(supabase, body)
    if (action === 'lookup_status') return handleLookupStatus(supabase, body)
    if (action === 'submit_ai_screening') return handleSubmitScreening(supabase, body)
    if (action === 'trigger_voice_interview') return handleTriggerVoice(supabase, body)

    return jsonResponse({ error: 'Unsupported applicant workflow action.' }, 400)
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500)
  }
})
