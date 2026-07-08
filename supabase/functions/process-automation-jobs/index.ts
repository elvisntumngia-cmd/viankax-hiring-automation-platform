import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { evaluateAiScreening } from '../_shared/openai-screening.ts'
import { createVoiceInterview } from '../_shared/voice-interview-provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AutomationJob = {
  id: string
  applicant_id: string
  workflow_run_id: string | null
  job_type: string
  job_label: string
  job_status: string
  priority: number
  scheduled_for: string
  attempts: number
  last_error: string | null
  payload: Record<string, unknown>
  applicants?: {
    full_name?: string
    current_stage?: string
    jobs?: { title?: string }
  }
}

type NotificationRow = {
  id: string
  applicant_id?: string
  recipient: string
  subject: string | null
  message: string
  metadata?: Record<string, unknown>
  applicants?: {
    full_name?: string
  }
}

type CalendarSettings = {
  provider: string
  interviewerEmail: string
  interviewDuration: string
  bufferTime: string
  schedulingWindow: string
}

const defaultCalendarSettings: CalendarSettings = {
  provider: 'Internal calendar',
  interviewerEmail: 'hr@viankax.com',
  interviewDuration: '30',
  bufferTime: '15',
  schedulingWindow: '3 business days after voice interview',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function normalizedList(value: unknown) {
  return Array.isArray(value) ? value : value ? [value] : []
}

function mapCalendarSettings(row: Record<string, any> | null): CalendarSettings {
  if (!row) return defaultCalendarSettings

  return {
    provider: row.provider ?? defaultCalendarSettings.provider,
    interviewerEmail: row.interviewer_email ?? defaultCalendarSettings.interviewerEmail,
    interviewDuration: String(row.interview_duration_minutes ?? defaultCalendarSettings.interviewDuration),
    bufferTime: String(row.buffer_minutes ?? defaultCalendarSettings.bufferTime),
    schedulingWindow: row.scheduling_window ?? defaultCalendarSettings.schedulingWindow,
  }
}

function calendarProviderKey(provider: string) {
  const normalized = String(provider ?? '').toLowerCase()

  if (normalized.includes('google')) return 'google_calendar'
  if (normalized.includes('microsoft') || normalized.includes('outlook')) return 'microsoft_outlook'
  return 'internal_calendar'
}

function addBusinessDays(startDate: Date, businessDays: number) {
  const date = new Date(startDate)
  let addedDays = 0

  while (addedDays < businessDays) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) addedDays += 1
  }

  return date
}

function scheduledDateFromCalendarSettings(settings: CalendarSettings) {
  const windowText = settings.schedulingWindow ?? defaultCalendarSettings.schedulingWindow
  const days = Number(windowText.match(/\d+/)?.[0] ?? 3)
  const usesBusinessDays = windowText.toLowerCase().includes('business')
  const scheduledDate = usesBusinessDays
    ? addBusinessDays(new Date(), days)
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  scheduledDate.setHours(10, 0, 0, 0)
  return scheduledDate.toISOString()
}

async function fetchCalendarSettings(supabase: ReturnType<typeof createClient>) {
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

async function insertInterviewSchedule(supabase: ReturnType<typeof createClient>, scheduleRow: Record<string, unknown>) {
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
  if (fallbackResult.error) throw fallbackResult.error
  return fallbackResult
}

function processedEventForJob(job: AutomationJob, provider = 'placeholder') {
  const eventMap: Record<string, [string, string, string]> = {
    send_confirmation_sms: ['confirmation_sms_sent', 'Confirmation SMS Sent', 'Placeholder SMS confirmation was marked as sent.'],
    send_confirmation_email: ['confirmation_email_sent', 'Confirmation Email Sent', 'Placeholder email confirmation was marked as sent.'],
    parse_resume: ['resume_screened', 'Resume Screened', 'Placeholder resume parsing completed and candidate moved forward.'],
    send_ai_assessment: ['ai_assessment_sent', 'AI Assessment Sent', 'Placeholder AI screening assessment invite was queued for the candidate.'],
    evaluate_ai_assessment: ['ai_screening_evaluated', 'AI Screening Evaluated', 'AI screening evaluation generated structured candidate scores.'],
    verify_license: ['license_verification_completed', 'License Verification Completed', 'Placeholder license verification completed.'],
    send_scheduling_link: ['scheduling_link_sent', 'Scheduling Link Sent', 'Placeholder scheduling link was marked as sent.'],
    voice_interview_analysis: ['voice_interview_analyzed', 'Voice Interview Analyzed', 'Placeholder voice interview analysis completed.'],
  }
  const [type, label, description] = eventMap[job.job_type] ?? [
    'automation_job_processed',
    'Automation Job Processed',
    'Placeholder automation job completed.',
  ]

  return {
    applicant_id: job.applicant_id,
    event_type: type,
    event_status: 'complete',
    event_label: label,
    metadata: {
      automationJobId: job.id,
      jobType: job.job_type,
      description,
      processor: 'supabase_edge_function',
      provider,
    },
  }
}

function emailHtml(notification: NotificationRow) {
  const assessmentUrl = typeof notification.metadata?.assessmentUrl === 'string'
    ? notification.metadata.assessmentUrl
    : ''
  const actionButton = assessmentUrl
    ? `<a href="${assessmentUrl}" style="display:inline-block;background:#0084ff;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:12px 18px;margin:4px 0 18px;">Complete screening assessment</a>`
    : ''

  return `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#09090b;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px;">
          <div style="font-size:18px;font-weight:700;">ViankaX Hiring Automation</div>
          <div style="margin-top:6px;color:#a1a1aa;font-size:13px;">Applicant workflow update</div>
        </div>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px;">
          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;">${notification.subject ?? 'Your application update'}</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#374151;">${notification.message}</p>
          ${actionButton}
          <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;color:#6b7280;font-size:13px;line-height:1.6;">
            This message was generated by the ViankaX Hiring Automation Platform.
          </div>
        </div>
      </div>
    </div>
  `
}

async function sendResendEmail(notification: NotificationRow) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'ViankaX Hiring <onboarding@resend.dev>'
  const replyTo = Deno.env.get('RESEND_REPLY_TO')

  if (!resendApiKey) {
    return {
      sent: false,
      providerMessageId: null,
      provider: 'placeholder',
      note: 'RESEND_API_KEY is not configured; placeholder email send was used.',
    }
  }

  const emailBody: Record<string, unknown> = {
    from: resendFromEmail,
    to: notification.recipient,
    subject: notification.subject ?? 'ViankaX Hiring Automation',
    text: notification.message,
    html: emailHtml(notification),
  }

  if (replyTo) {
    emailBody.reply_to = replyTo
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailBody),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message ?? 'Resend email request failed.')
  }

  return {
    sent: true,
    providerMessageId: result?.id ?? null,
    provider: 'resend',
    note: 'Email sent with Resend.',
  }
}

async function buildAiScreeningContext(supabase: ReturnType<typeof createClient>, applicantId: string) {
  const [{ data: applicant, error: applicantError }, { data: answers, error: answersError }] = await Promise.all([
    supabase
      .from('applicants')
      .select(`
        id,
        full_name,
        email,
        phone,
        location,
        current_stage,
        knockout_result,
        license_status,
        jobs(title, location, license_requirements, shift_options, site_id, open_shift_id),
        assigned_shift:open_shifts!applicants_open_shift_id_fkey(*, job_sites(*))
      `)
      .eq('id', applicantId)
      .single(),
    supabase
      .from('screening_answers')
      .select('question, answer, category')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: true }),
  ])

  if (applicantError) throw applicantError
  if (answersError) throw answersError

  return {
    applicant,
    screeningAnswers: Object.fromEntries((answers ?? []).map((answer: Record<string, string>) => [answer.question, answer.answer ?? ''])),
  }
}

async function buildVoiceInterviewContext(supabase: ReturnType<typeof createClient>, applicantId: string) {
  const { data, error } = await supabase
    .from('applicants')
    .select(`
      id,
      full_name,
      phone,
      jobs(title),
      ai_recommendations(summary),
      candidate_scores(screening_score, overall_candidate_score)
    `)
    .eq('id', applicantId)
    .single()

  if (error) throw error
  return data
}

async function updateWorkflowAfterJob(supabase: ReturnType<typeof createClient>, workflowRunId: string | null) {
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

async function applyPlaceholderJobEffects(supabase: ReturnType<typeof createClient>, job: AutomationJob) {
  const now = new Date().toISOString()
  const effects = []
  let provider = 'placeholder'

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
    const { data: notifications, error: notificationError } = await supabase
      .from('notification_queue')
      .select('id, recipient, subject, message, metadata')
      .eq('applicant_id', job.applicant_id)
      .eq('channel', 'email')
      .eq('notification_status', 'queued')
      .limit(1)

    if (notificationError) throw notificationError
    const notification = notifications?.[0] as NotificationRow | undefined

    if (notification) {
      const emailResult = await sendResendEmail(notification)
      provider = emailResult.provider
      effects.push(
        supabase
          .from('notification_queue')
          .update({
            notification_status: 'sent',
            sent_at: now,
            provider_message_id: emailResult.providerMessageId,
            metadata: {
              ...(notification.metadata ?? {}),
              provider: emailResult.provider,
              note: emailResult.note,
            },
            updated_at: now,
          })
          .eq('id', notification.id),
      )
    }
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
          changed_by: 'edge_function_processor',
          reason: 'Placeholder resume parsing completed.',
        }),
    )
  }

  if (job.job_type === 'evaluate_ai_assessment') {
    const context = await buildAiScreeningContext(supabase, job.applicant_id)
    const evaluation = await evaluateAiScreening(context)
    provider = evaluation.provider
    const recommendationStatus = evaluation.screeningRecommendation === 'Not Recommended'
      ? 'Needs Review'
      : 'Qualified'
    const nextStage = evaluation.suggestedNextStep === 'Reject'
      ? 'Ready for Review'
      : 'Assessment Completed'

    effects.push(
      supabase
        .from('ai_screening_tasks')
        .update({
          task_status: 'completed',
          ai_summary: evaluation.aiSummary,
          role_fit_score: evaluation.experienceScore,
          professionalism_score: evaluation.communicationScore,
          communication_score: evaluation.communicationScore,
          availability_score: evaluation.availabilityScore,
          risk_flags: evaluation.riskFlags,
          recommendation: evaluation.screeningRecommendation,
          candidate_context: {
            ...(context as Record<string, unknown>),
            placementSignals: evaluation.placementSignals,
            strengths: evaluation.strengths,
            concerns: evaluation.concerns,
            suggestedNextStep: evaluation.suggestedNextStep,
            provider: evaluation.provider,
            model: evaluation.model,
          },
          completed_at: now,
          updated_at: now,
        })
        .eq('applicant_id', job.applicant_id)
        .in('task_status', ['queued', 'running']),
    )
    effects.push(
      supabase
        .from('candidate_scores')
        .upsert({
          applicant_id: job.applicant_id,
          eligibility_score: evaluation.eligibilityScore,
          screening_score: evaluation.overallScreeningScore,
          overall_candidate_score: evaluation.overallScreeningScore,
          updated_at: now,
        }, { onConflict: 'applicant_id' }),
    )
    effects.push(
      supabase
        .from('ai_recommendations')
        .upsert({
          applicant_id: job.applicant_id,
          recommendation: evaluation.screeningRecommendation,
          confidence: evaluation.overallScreeningScore,
          summary: evaluation.aiSummary,
          risk_flags: evaluation.riskFlags,
          updated_at: now,
        }, { onConflict: 'applicant_id' }),
    )
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: nextStage,
          status: recommendationStatus,
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
          to_stage: nextStage,
          changed_by: 'edge_function_processor',
          reason: `${evaluation.provider === 'openai' ? 'OpenAI' : 'Fallback'} AI screening evaluation completed. ${evaluation.suggestedNextStep}.`,
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
          changed_by: 'edge_function_processor',
          reason: 'Placeholder license verification completed.',
        }),
    )
  }

  if (job.job_type === 'voice_interview_analysis') {
    const applicant = await buildVoiceInterviewContext(supabase, job.applicant_id)
    const voiceResult = await createVoiceInterview({
      provider: 'vapi',
      applicantId: job.applicant_id,
      applicantName: applicant.full_name ?? job.applicants?.full_name ?? 'Applicant',
      applicantPhone: applicant.phone,
      roleTitle: applicant.jobs?.title ?? job.applicants?.jobs?.title ?? 'Security role',
      screeningSummary: applicant.ai_recommendations?.[0]?.summary ?? 'AI screening completed.',
      workflowRunId: job.workflow_run_id,
      supabaseUrl: Deno.env.get('SUPABASE_URL') ?? undefined,
    })
    provider = voiceResult.provider
    const voiceNextStage = voiceResult.status === 'completed'
      ? 'Voice Interview Complete'
      : (job.applicants?.current_stage ?? 'License Verified')
    const voiceInterviewStatus = voiceResult.status === 'completed' ? 'Complete' : 'Sent'

    effects.push(
      supabase
        .from('voice_interviews')
        .upsert({
          applicant_id: job.applicant_id,
          provider: voiceResult.provider,
          provider_call_id: voiceResult.providerCallId,
          interview_url: voiceResult.interviewUrl,
          recording_url: voiceResult.provider === 'placeholder' ? voiceResult.interviewUrl : null,
          transcript: voiceResult.transcript ?? 'Voice interview has been sent. Waiting for candidate completion and Vapi webhook callback.',
          score: voiceResult.score ?? null,
          recommendation: voiceResult.recommendation ?? 'Waiting for completed Vapi voice interview.',
          status: voiceResult.status === 'completed' ? 'Complete' : 'Sent',
          raw_provider_payload: voiceResult.rawProviderPayload ?? {},
          completed_at: voiceResult.status === 'completed' ? now : null,
          updated_at: now,
        }, { onConflict: 'provider_call_id' }),
    )
    if (voiceResult.status === 'completed' && Number.isFinite(voiceResult.score)) {
      effects.push(
        supabase
          .from('candidate_scores')
          .update({
            voice_interview_score: voiceResult.score,
            overall_candidate_score: voiceResult.score,
            updated_at: now,
          })
          .eq('applicant_id', job.applicant_id),
      )
    }
    effects.push(
      supabase
        .from('applicants')
        .update({
          current_stage: voiceNextStage,
          interview_status: voiceInterviewStatus,
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
          to_stage: voiceNextStage,
          changed_by: 'edge_function_processor',
          reason: voiceResult.status === 'completed'
            ? 'Fallback voice interview analysis completed automatically.'
            : 'Vapi voice interview call was created and sent to the candidate.',
        }),
    )
  }

  if (job.job_type === 'send_scheduling_link') {
    const calendarSettings = await fetchCalendarSettings(supabase)
    const calendarProvider = calendarProviderKey(calendarSettings.provider)
    const scheduledFor = scheduledDateFromCalendarSettings(calendarSettings)
    const placementMatches = await generatePlacementMatches(supabase, job.applicant_id)
    effects.push(
      insertInterviewSchedule(supabase, {
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
          changed_by: 'edge_function_processor',
          reason: 'Final in-person interview was scheduled and AI placement matches were generated automatically.',
        }),
    )
    if (placementMatches.length) {
      effects.push(supabase.from('placement_matches').insert(placementMatches))
    }
  }

  effects.push(supabase.from('automation_events').insert(processedEventForJob(job, provider)))

  const results = await Promise.all(effects)
  const effectError = results.find((result) => result.error)?.error
  if (effectError) throw effectError
}

async function generatePlacementMatches(supabase: ReturnType<typeof createClient>, applicantId: string) {
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
    .map((shift: Record<string, any>) => {
      let matchScore = Math.min(96, Math.max(45, baseScore))
      const strengths: string[] = []
      const concerns: string[] = []
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
        strengths.push(...matchingTraits.map(String))
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

async function hasSubmittedAiAssessment(supabase: ReturnType<typeof createClient>, applicantId: string) {
  const { data, error } = await supabase
    .from('screening_answers')
    .select('id')
    .eq('applicant_id', applicantId)
    .eq('category', 'ai_assessment')
    .limit(1)

  if (error) throw error
  return Boolean(data?.length)
}

async function hasCompletedVoiceInterview(supabase: ReturnType<typeof createClient>, applicantId: string) {
  const { data, error } = await supabase
    .from('voice_interviews')
    .select('id')
    .eq('applicant_id', applicantId)
    .eq('status', 'Complete')
    .limit(1)

  if (error) throw error
  return Boolean(data?.length)
}

async function deferAiAssessmentEvaluation(supabase: ReturnType<typeof createClient>, job: AutomationJob) {
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
  await updateWorkflowAfterJob(supabase, job.workflow_run_id)

  return {
    processed: false,
    message: 'AI screening evaluation is waiting for applicant answers. The job was deferred.',
    job: {
      id: job.id,
      type: job.job_type,
      label: job.job_label,
      status: 'queued',
      scheduledFor: nextCheckAt,
      applicantName: job.applicants?.full_name ?? 'Unknown applicant',
    },
  }
}

async function deferAutomationJob(supabase: ReturnType<typeof createClient>, job: AutomationJob, reason: string) {
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
  await updateWorkflowAfterJob(supabase, job.workflow_run_id)

  return {
    processed: false,
    message: `${job.job_label} is waiting. ${reason}`,
    job: {
      id: job.id,
      type: job.job_type,
      label: job.job_label,
      status: 'queued',
      scheduledFor: nextCheckAt,
      applicantName: job.applicants?.full_name ?? 'Unknown applicant',
    },
  }
}

async function processOrphanedEmailNotification(supabase: ReturnType<typeof createClient>) {
  const now = new Date().toISOString()
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('id, applicant_id, recipient, subject, message, metadata, created_at, applicants(full_name)')
    .eq('channel', 'email')
    .eq('notification_status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  const notification = notifications?.[0] as NotificationRow | undefined

  if (!notification) {
    return jsonResponse({ processed: false, message: 'No queued automation jobs or email notifications are ready.' })
  }

  const emailResult = await sendResendEmail(notification)
  const { error: notificationError } = await supabase
    .from('notification_queue')
    .update({
      notification_status: 'sent',
      sent_at: now,
      provider_message_id: emailResult.providerMessageId,
      metadata: {
        ...(notification.metadata ?? {}),
        provider: emailResult.provider,
        note: `${emailResult.note} Recovered queued notification without a ready automation job.`,
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
        template: notification.metadata?.template ?? 'email_notification',
        provider: emailResult.provider,
        description: 'Recovered an email notification that was queued without a ready automation job.',
      },
    })

  if (eventError) throw eventError

  return jsonResponse({
    processed: true,
    message: `Queued email notification processed for ${notification.applicants?.full_name ?? notification.recipient}.`,
    notification: {
      id: notification.id,
      provider: emailResult.provider,
      providerMessageId: emailResult.providerMessageId,
    },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase function environment variables.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body = await request.json().catch(() => ({}))
    const maxJobs = Math.min(Math.max(Number(body?.maxJobs ?? 10), 1), 25)
    const processedJobs: Array<Record<string, unknown>> = []
    const deferredJobs: Array<Record<string, unknown>> = []

    for (let index = 0; index < maxJobs; index += 1) {
      const now = new Date().toISOString()
      const { data: jobs, error: jobError } = await supabase
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
          applicants(full_name, current_stage, jobs(title))
        `)
        .eq('job_status', 'queued')
        .lte('scheduled_for', now)
        .order('priority', { ascending: true })
        .order('scheduled_for', { ascending: true })
        .limit(1)

      if (jobError) throw jobError
      const job = jobs?.[0] as AutomationJob | undefined

      if (!job) {
        if (!processedJobs.length && !deferredJobs.length) {
          return processOrphanedEmailNotification(supabase)
        }
        break
      }

      if (job.job_type === 'evaluate_ai_assessment' && !(await hasSubmittedAiAssessment(supabase, job.applicant_id))) {
        deferredJobs.push(await deferAiAssessmentEvaluation(supabase, job))
        continue
      }

      if (
        ['voice_interview_analysis', 'send_scheduling_link'].includes(job.job_type) &&
        !(await hasSubmittedAiAssessment(supabase, job.applicant_id))
      ) {
        deferredJobs.push(await deferAutomationJob(supabase, job, 'Waiting for applicant to complete AI screening assessment.'))
        continue
      }

      if (job.job_type === 'send_scheduling_link' && !(await hasCompletedVoiceInterview(supabase, job.applicant_id))) {
        deferredJobs.push(await deferAutomationJob(supabase, job, 'Waiting for Vapi voice interview completion.'))
        continue
      }

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
        await applyPlaceholderJobEffects(supabase, job)

        const { error: completedError } = await supabase
          .from('automation_jobs')
          .update({
            job_status: 'completed',
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        if (completedError) throw completedError
        await updateWorkflowAfterJob(supabase, job.workflow_run_id)

        processedJobs.push({
          id: job.id,
          type: job.job_type,
          label: job.job_label,
          status: 'completed',
          applicantName: job.applicants?.full_name ?? 'Unknown applicant',
        })
      } catch (processError) {
        await supabase
          .from('automation_jobs')
          .update({
            job_status: 'failed',
            last_error: errorMessage(processError),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        await updateWorkflowAfterJob(supabase, job.workflow_run_id)
        throw processError
      }
    }

    return jsonResponse({
      processed: processedJobs.length > 0,
      processedCount: processedJobs.length,
      deferredCount: deferredJobs.length,
      message: processedJobs.length
        ? `Processed ${processedJobs.length} automation job${processedJobs.length === 1 ? '' : 's'}.`
        : deferredJobs.length
          ? `Deferred ${deferredJobs.length} automation job${deferredJobs.length === 1 ? '' : 's'} waiting for applicant action.`
          : 'No queued automation jobs are ready.',
      jobs: processedJobs,
      deferredJobs,
    })
  } catch (error) {
    return jsonResponse({ processed: false, error: errorMessage(error) }, 500)
  }
})
