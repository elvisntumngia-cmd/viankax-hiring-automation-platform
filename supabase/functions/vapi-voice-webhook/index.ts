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
  if (!Number.isFinite(value)) return 88
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get('VAPI_WEBHOOK_SECRET')
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization') ?? ''
      const secretHeader = request.headers.get('x-vapi-secret') ?? ''
      const authorized = authHeader === `Bearer ${webhookSecret}` || secretHeader === webhookSecret
      if (!authorized) return jsonResponse({ ok: false, error: 'Unauthorized webhook request.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment variables.')

    const body = await request.json().catch(() => ({}))
    const message = extractMessage(body)
    const call = extractCall(message)
    const callId = call.id ?? message.callId ?? message.call?.id
    const applicantId = call.metadata?.applicantId ?? message.metadata?.applicantId
    const eventType = message.type ?? body.type ?? 'vapi_event'
    const isCompletionEvent = ['end-of-call-report', 'call-ended', 'call.completed', 'call.ended'].includes(eventType) ||
      Boolean(message.endedReason || call.endedReason || message.endedAt || call.endedAt)

    if (!callId && !applicantId) {
      throw new Error('Vapi webhook did not include a call id or applicant id.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const score = scoreFromPayload(message, call)
    const transcript = transcriptFromPayload(message, call)
    const recordingUrl = recordingFromPayload(message, call)
    const now = new Date().toISOString()

    const updateQuery = supabase
      .from('voice_interviews')
      .update({
        provider: 'vapi',
        recording_url: recordingUrl,
        transcript,
        score,
        recommendation: score >= 85 ? 'Proceed to final in-person interview' : score >= 70 ? 'Proceed with HR review' : 'Hold for HR review',
        status: isCompletionEvent ? 'Complete' : 'In Progress',
        raw_provider_payload: body,
        completed_at: isCompletionEvent ? now : null,
        updated_at: now,
      })

    const { error: voiceError } = callId
      ? await updateQuery.eq('provider_call_id', callId)
      : await updateQuery.eq('applicant_id', applicantId)

    if (voiceError) throw voiceError

    if (isCompletionEvent && applicantId) {
      const [{ error: scoreError }, { error: applicantError }, { error: historyError }, { error: eventError }, { error: scheduleJobError }] = await Promise.all([
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
            status: 'Qualified',
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
              eventType,
              description: 'Vapi returned voice interview transcript and score.',
            },
          }),
        supabase
          .from('automation_jobs')
          .update({
            scheduled_for: now,
            last_error: null,
            updated_at: now,
          })
          .eq('applicant_id', applicantId)
          .eq('job_type', 'send_scheduling_link')
          .eq('job_status', 'queued'),
      ])

      if (scoreError) throw scoreError
      if (applicantError) throw applicantError
      if (historyError) throw historyError
      if (eventError) throw eventError
      if (scheduleJobError) throw scheduleJobError
    }

    return jsonResponse({ ok: true, callId, applicantId, eventType, completed: isCompletionEvent })
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500)
  }
})

