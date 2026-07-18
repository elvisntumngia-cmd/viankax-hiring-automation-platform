import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function clampScore(score: unknown) {
  const value = Number(score)
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

function extractMessage(body: Record<string, any>) {
  return body.message ?? body
}

function extractCall(message: Record<string, any>) {
  return message.call ?? message
}

function transcriptFromPayload(message: Record<string, any>, call: Record<string, any>) {
  if (typeof message.transcript === 'string') return message.transcript
  if (typeof call.transcript === 'string') return call.transcript
  const messages = message.artifact?.messages ?? call.messages ?? message.messages
  if (Array.isArray(messages)) {
    return messages
      .map((item) => `${item.role ?? item.speakerLabel ?? 'speaker'}: ${item.message ?? item.text ?? ''}`)
      .filter((line) => !line.endsWith(': '))
      .join('\n')
  }
  return 'Vapi voice interview completed. Transcript was not included in the webhook payload.'
}

function notesFromPayload(message: Record<string, any>, call: Record<string, any>) {
  return message.analysis?.summary ??
    call.analysis?.summary ??
    message.summary ??
    call.summary ??
    message.structuredData?.summary ??
    call.structuredData?.summary ??
    null
}

function recommendationFromPayload(message: Record<string, any>, call: Record<string, any>, score: number) {
  return message.analysis?.structuredData?.recommendation ??
    message.structuredData?.recommendation ??
    call.analysis?.structuredData?.recommendation ??
    call.structuredData?.recommendation ??
    (score >= 85 ? 'Proceed to final in-person interview' : score >= 70 ? 'Proceed with HR review' : 'Hold for HR review')
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function heuristicVoiceEvaluation(transcript: string, providerScore: number | null, providerNotes: string | null) {
  const normalized = transcript.toLowerCase()
  const words = wordCount(transcript)
  const concerns: string[] = []
  let score = providerScore ? Math.min(providerScore, 82) : 68

  const nonsenseSignals = [
    'crab',
    'blah',
    'asdf',
    'gibberish',
    'random',
    'nothing to say',
    'i do not know',
    "i don't know",
    'no answer',
    'skip',
    'whatever',
  ]
  const nonsenseHits = nonsenseSignals.filter((signal) => normalized.includes(signal))
  const positiveSignals = [
    'security',
    'guard',
    'license',
    'reliable',
    'transportation',
    'available',
    'patrol',
    'incident',
    'report',
    'customer',
    'professional',
    'communication',
    'de-escalation',
    'post orders',
    'observe',
    'report',
    'access control',
    'punctual',
    'on time',
    'team',
    'supervisor',
  ].filter((signal) => normalized.includes(signal))
  const evidenceCount = new Set(positiveSignals).size

  if (words < 25) {
    score = Math.min(score, 45)
    concerns.push('Very limited voice interview response.')
  }

  if (words < 60) {
    score = Math.min(score, 62)
    concerns.push('Voice interview did not include enough detail for automatic scheduling.')
  }

  if (nonsenseHits.length) {
    score = Math.min(score, nonsenseHits.includes('crab') ? 28 : 42)
    concerns.push(`Irrelevant or nonsensical response detected: ${nonsenseHits.join(', ')}.`)
  }

  if (evidenceCount < 3) {
    score = Math.min(score, 58)
    concerns.push('Candidate did not provide enough role-relevant evidence in the voice interview.')
  }

  if (evidenceCount < 5 && words < 120) {
    score = Math.min(score, 72)
    concerns.push('Candidate needs HR review because role fit evidence was limited.')
  }

  if (!concerns.length && evidenceCount >= 7 && words >= 100) {
    score = Math.max(score, providerScore ? Math.min(providerScore, 92) : 84)
  }

  const recommendation = score >= 85
    ? 'Proceed to final in-person interview'
    : score >= 70
      ? 'Proceed with HR review'
      : score >= 50
        ? 'Hold for HR review'
        : 'Not recommended after voice interview'

  const summary = providerNotes ??
    (concerns.length
      ? `Voice interview needs HR review. ${concerns.join(' ')}`
      : 'Voice interview responses were relevant enough for continued HR review.')

  return {
    provider: 'heuristic',
    score,
    recommendation,
    summary,
    concerns,
    shouldSchedule: score >= 85 && concerns.length === 0,
  }
}

function applyVoiceGuardrails(
  evaluation: Record<string, any>,
  fallback: ReturnType<typeof heuristicVoiceEvaluation>,
) {
  const modelScore = Number(evaluation.score)
  const safeModelScore = Number.isFinite(modelScore)
    ? Math.max(0, Math.min(100, Math.round(modelScore)))
    : fallback.score
  const hardBlocked = fallback.score < 70 || fallback.concerns.length > 0
  const score = hardBlocked ? Math.min(safeModelScore, fallback.score) : safeModelScore
  const concerns = [
    ...(Array.isArray(evaluation.concerns) ? evaluation.concerns : []),
    ...fallback.concerns,
  ].filter(Boolean)
  const shouldSchedule = Boolean(evaluation.shouldSchedule) &&
    !hardBlocked &&
    fallback.shouldSchedule &&
    score >= 85
  const recommendation = shouldSchedule
    ? 'Proceed to final in-person interview'
    : score >= 70
      ? 'Proceed with HR review'
      : score >= 50
        ? 'Hold for HR review'
        : 'Not recommended after voice interview'
  const guardrailNote = hardBlocked
    ? ' ViankaX guardrails blocked automatic scheduling because the transcript did not provide enough credible role-fit evidence.'
    : ''

  return {
    provider: 'openai_guarded',
    score,
    recommendation,
    summary: `${evaluation.summary ?? fallback.summary}${guardrailNote}`,
    concerns,
    shouldSchedule,
  }
}

async function evaluateVoiceInterview(transcript: string, providerScore: number | null, providerNotes: string | null) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini'
  const fallback = heuristicVoiceEvaluation(transcript, providerScore, providerNotes)

  if (!apiKey) return fallback

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [
              'You evaluate a security officer voice interview for ViankaX.',
              'Be strict. Penalize irrelevant, evasive, joking, generic, very short, or nonsensical answers heavily.',
              'Do not recommend final in-person scheduling unless the transcript gives specific evidence of role fit, professionalism, reliability, communication, availability, and security/site readiness.',
              'A candidate with nonsense answers, one-word answers, vague answers, or fewer than several role-relevant details must be routed to HR review or not recommended.',
              'Return only JSON.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              transcript,
              providerScore,
              providerNotes,
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'viankax_voice_interview_evaluation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                score: { type: 'integer', minimum: 0, maximum: 100 },
                recommendation: {
                  type: 'string',
                  enum: [
                    'Proceed to final in-person interview',
                    'Proceed with HR review',
                    'Hold for HR review',
                    'Not recommended after voice interview',
                  ],
                },
                summary: { type: 'string' },
                concerns: { type: 'array', items: { type: 'string' } },
                shouldSchedule: { type: 'boolean' },
              },
              required: ['score', 'recommendation', 'summary', 'concerns', 'shouldSchedule'],
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message ?? 'OpenAI voice evaluation failed.')

    const outputText = typeof result.output_text === 'string'
      ? result.output_text
      : result.output?.flatMap((item: Record<string, any>) => item.content ?? [])
        .find((content: Record<string, any>) => typeof content.text === 'string')?.text
    const evaluation = JSON.parse(outputText)
    const score = Number(evaluation.score)

    return applyVoiceGuardrails(evaluation, fallback)
  } catch (error) {
    return {
      ...fallback,
      summary: `${fallback.summary} OpenAI voice evaluation fallback used: ${errorMessage(error)}.`,
    }
  }
}

function combinedTranscript(notes: string | null, transcript: string) {
  if (!notes) return transcript

  return [
    'AI voice interview notes:',
    notes,
    '',
    'Transcript:',
    transcript,
  ].join('\n')
}

function scoreFromPayload(message: Record<string, any>, call: Record<string, any>) {
  return clampScore(
    message.analysis?.successEvaluation ??
      message.analysis?.score ??
      message.structuredData?.score ??
      call.analysis?.successEvaluation ??
      call.analysis?.score,
  )
}

function recordingFromPayload(message: Record<string, any>, call: Record<string, any>) {
  return message.recordingUrl ??
    message.artifact?.recordingUrl ??
    call.recordingUrl ??
    call.artifact?.recordingUrl ??
    null
}

async function findVoiceInterview(
  supabase: ReturnType<typeof createClient>,
  callId: string | null,
  applicantId: string | null,
) {
  const query = supabase
    .from('voice_interviews')
    .select('id, applicant_id, provider_call_id, status')
    .limit(1)

  const { data, error } = callId
    ? await query.eq('provider_call_id', callId)
    : await query.eq('applicant_id', applicantId)

  if (error) throw error
  return data?.[0] ?? null
}

async function wakeSchedulingJob(supabase: ReturnType<typeof createClient>, applicantId: string, now: string) {
  const { data: existingJob, error: existingJobError } = await supabase
    .from('automation_jobs')
    .select('id, workflow_run_id, job_status')
    .eq('applicant_id', applicantId)
    .eq('job_type', 'send_scheduling_link')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingJobError) throw existingJobError

  if (existingJob) {
    const { error } = await supabase
      .from('automation_jobs')
      .update({
        job_status: existingJob.job_status === 'completed' ? 'completed' : 'queued',
        scheduled_for: now,
        last_error: existingJob.job_status === 'completed' ? 'Scheduling already completed.' : null,
        updated_at: now,
      })
      .eq('id', existingJob.id)

    if (error) throw error
    return existingJob.id
  }

  const { data: workflowRun, error: workflowRunError } = await supabase
    .from('workflow_runs')
    .select('id')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (workflowRunError) throw workflowRunError

  const { data: insertedJob, error: insertError } = await supabase
    .from('automation_jobs')
    .insert({
      applicant_id: applicantId,
      workflow_run_id: workflowRun?.id ?? null,
      job_type: 'send_scheduling_link',
      job_label: 'Schedule final in-person interview',
      job_status: 'queued',
      priority: 7,
      scheduled_for: now,
      payload: {
        provider: 'calendar',
        mode: 'created_from_vapi_webhook',
      },
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return insertedJob.id
}

async function queueCandidateFollowupEmail(
  supabase: ReturnType<typeof createClient>,
  applicantId: string,
  now: string,
  voiceEvaluation: Record<string, any>,
) {
  const { data: applicant, error: applicantError } = await supabase
    .from('applicants')
    .select('email')
    .eq('id', applicantId)
    .single()

  if (applicantError) throw applicantError
  if (!applicant?.email) return null

  const { data: existingJob, error: existingJobError } = await supabase
    .from('automation_jobs')
    .select('id, workflow_run_id, job_status')
    .eq('applicant_id', applicantId)
    .eq('job_type', 'send_candidate_followup_email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingJobError) throw existingJobError

  let automationJobId = existingJob?.id ?? null
  if (!automationJobId) {
    const { data: workflowRun } = await supabase
      .from('workflow_runs')
      .select('id')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: insertedJob, error: insertJobError } = await supabase
      .from('automation_jobs')
      .insert({
        applicant_id: applicantId,
        workflow_run_id: workflowRun?.id ?? null,
        job_type: 'send_candidate_followup_email',
        job_label: 'Send candidate follow-up email',
        job_status: 'queued',
        priority: 9,
        scheduled_for: now,
        payload: {
          channel: 'email',
          template: 'voice_review_followup',
        },
      })
      .select('id')
      .single()

    if (insertJobError) throw insertJobError
    automationJobId = insertedJob.id
  } else {
    const { error: wakeJobError } = await supabase
      .from('automation_jobs')
      .update({
        job_status: 'queued',
        scheduled_for: now,
        last_error: null,
        updated_at: now,
      })
      .eq('id', automationJobId)
      .in('job_status', ['blocked', 'queued', 'failed', 'running'])

    if (wakeJobError) throw wakeJobError
  }

  const { data: existingNotification, error: existingNotificationError } = await supabase
    .from('notification_queue')
    .select('id')
    .eq('applicant_id', applicantId)
    .eq('channel', 'email')
    .contains('metadata', { template: 'voice_review_followup' })
    .limit(1)
    .maybeSingle()

  if (existingNotificationError) throw existingNotificationError
  if (existingNotification) return existingNotification.id

  const { data: insertedNotification, error: notificationError } = await supabase
    .from('notification_queue')
    .insert({
      applicant_id: applicantId,
      automation_job_id: automationJobId,
      channel: 'email',
      recipient: applicant.email,
      subject: 'Thank you for completing your ViankaX interview',
      message: 'Thank you for completing the ViankaX hiring automation steps. Our team will review your application, screening results, and voice interview details. We will be in touch with next steps.',
      notification_status: 'queued',
      scheduled_for: now,
      metadata: {
        template: 'voice_review_followup',
        voiceScore: voiceEvaluation.score,
        recommendation: voiceEvaluation.recommendation,
        shouldSchedule: voiceEvaluation.shouldSchedule,
      },
    })
    .select('id')
    .single()

  if (notificationError) throw notificationError
  return insertedNotification.id
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get('VAPI_WEBHOOK_SECRET')
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization') ?? ''
      const secretHeader = request.headers.get('x-vapi-secret') ?? ''
      const serverSecretHeader = request.headers.get('x-vapi-server-secret') ?? ''
      const serverUrlSecretHeader = request.headers.get('x-server-url-secret') ?? ''
      const authorized = authHeader === `Bearer ${webhookSecret}` ||
        secretHeader === webhookSecret ||
        serverSecretHeader === webhookSecret ||
        serverUrlSecretHeader === webhookSecret
      if (!authorized) return jsonResponse({ ok: false, error: 'Unauthorized webhook request.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment variables.')

    const body = await request.json().catch(() => ({}))
    const message = extractMessage(body)
    const call = extractCall(message)
    const callId = call.id ?? message.callId ?? message.call?.id
    const payloadApplicantId = call.metadata?.applicantId ?? message.metadata?.applicantId
    const eventType = message.type ?? body.type ?? 'vapi_event'
    const isCompletionEvent = ['end-of-call-report', 'call-ended', 'call.completed', 'call.ended'].includes(eventType) ||
      Boolean(message.endedReason || call.endedReason || message.endedAt || call.endedAt)

    if (!callId && !payloadApplicantId) {
      throw new Error('Vapi webhook did not include a call id or applicant id.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const existingVoiceInterview = await findVoiceInterview(supabase, callId ?? null, payloadApplicantId ?? null)
    const applicantId = payloadApplicantId ?? existingVoiceInterview?.applicant_id ?? null

    if (!applicantId) {
      throw new Error('Vapi webhook could not be matched to an applicant.')
    }

    const providerScore = scoreFromPayload(message, call)
    const transcript = transcriptFromPayload(message, call)
    const notes = notesFromPayload(message, call)
    const voiceEvaluation = await evaluateVoiceInterview(transcript, providerScore, notes)
    const score = voiceEvaluation.score
    const recommendation = recommendationFromPayload(message, call, score)
    const finalRecommendation = voiceEvaluation.recommendation ?? recommendation
    const recordingUrl = recordingFromPayload(message, call)
    const now = new Date().toISOString()

    const updateQuery = supabase
      .from('voice_interviews')
      .update({
        provider: 'vapi',
        recording_url: recordingUrl,
        transcript: combinedTranscript(voiceEvaluation.summary, transcript),
        score,
        recommendation: finalRecommendation,
        status: isCompletionEvent ? 'Complete' : 'In Progress',
        raw_provider_payload: {
          ...body,
          viankax_voice_evaluation: voiceEvaluation,
          provider_score: providerScore,
        },
        completed_at: isCompletionEvent ? now : null,
        updated_at: now,
      })

    const { data: updatedVoiceRows, error: voiceError } = callId
      ? await updateQuery.eq('provider_call_id', callId).select('id, applicant_id')
      : await updateQuery.eq('applicant_id', applicantId).select('id, applicant_id')

    if (voiceError) throw voiceError
    if (!updatedVoiceRows?.length) {
      throw new Error('No matching voice interview row was found for this Vapi webhook.')
    }

    if (isCompletionEvent) {
      const schedulingJobId = voiceEvaluation.shouldSchedule
        ? await wakeSchedulingJob(supabase, applicantId, now)
        : null
      const followupEmailId = voiceEvaluation.shouldSchedule
        ? null
        : await queueCandidateFollowupEmail(supabase, applicantId, now, voiceEvaluation)
      const [{ error: scoreError }, { error: applicantError }, { error: historyError }, { error: eventError }, { error: scheduleBlockError }] = await Promise.all([
        supabase
          .from('candidate_scores')
          .update({
            voice_interview_score: score,
            overall_candidate_score: score,
            updated_at: now,
          })
          .eq('applicant_id', applicantId),
        supabase
          .from('applicants')
          .update({
            current_stage: 'Voice Interview Complete',
            interview_status: 'Complete',
            status: voiceEvaluation.shouldSchedule ? 'Qualified' : 'Needs Review',
            updated_at: now,
          })
          .eq('id', applicantId),
        supabase
          .from('pipeline_stage_history')
          .insert({
            applicant_id: applicantId,
            from_stage: null,
            to_stage: 'Voice Interview Complete',
            changed_by: 'vapi_webhook',
            reason: 'Vapi voice interview webhook completed and updated the candidate profile.',
          }),
        supabase
          .from('automation_events')
          .insert({
            applicant_id: applicantId,
            event_type: 'vapi_voice_interview_completed',
            event_status: 'complete',
            event_label: 'Vapi Voice Interview Completed',
            metadata: {
              callId,
              score,
              providerScore,
              eventType,
              schedulingJobId,
              followupEmailId,
              notes: voiceEvaluation.summary,
              concerns: voiceEvaluation.concerns,
              recommendation: finalRecommendation,
              evaluationProvider: voiceEvaluation.provider,
              shouldSchedule: voiceEvaluation.shouldSchedule,
              description: voiceEvaluation.shouldSchedule
                ? 'Vapi returned voice interview transcript and ViankaX evaluation recommended final scheduling.'
                : 'Vapi returned voice interview transcript and ViankaX evaluation routed the candidate to HR review.',
            },
          }),
        supabase
          .from('automation_jobs')
          .update({
            job_status: voiceEvaluation.shouldSchedule ? 'queued' : 'blocked',
            scheduled_for: now,
            last_error: voiceEvaluation.shouldSchedule
              ? null
              : `Voice interview recommended HR review: ${voiceEvaluation.recommendation}.`,
            updated_at: now,
          })
          .eq('applicant_id', applicantId)
          .eq('job_type', 'send_scheduling_link')
          .in('job_status', ['blocked', 'queued', 'failed', 'running']),
      ])

      if (scoreError) throw scoreError
      if (applicantError) throw applicantError
      if (historyError) throw historyError
      if (eventError) throw eventError
      if (scheduleBlockError) throw scheduleBlockError
    }

    return jsonResponse({ ok: true, callId, applicantId, eventType, completed: isCompletionEvent })
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500)
  }
})
