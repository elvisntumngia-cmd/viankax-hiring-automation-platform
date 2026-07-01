import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function processedEventForJob(job: AutomationJob) {
  const eventMap: Record<string, [string, string, string]> = {
    send_confirmation_sms: ['confirmation_sms_sent', 'Confirmation SMS Sent', 'Placeholder SMS confirmation was marked as sent.'],
    send_confirmation_email: ['confirmation_email_sent', 'Confirmation Email Sent', 'Placeholder email confirmation was marked as sent.'],
    parse_resume: ['resume_screened', 'Resume Screened', 'Placeholder resume parsing completed and candidate moved forward.'],
    send_ai_assessment: ['ai_assessment_sent', 'AI Assessment Sent', 'Placeholder AI screening assessment invite was queued for the candidate.'],
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
    },
  }
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
          changed_by: 'edge_function_processor',
          reason: 'Placeholder resume parsing completed.',
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

  effects.push(supabase.from('automation_events').insert(processedEventForJob(job)))

  const results = await Promise.all(effects)
  const effectError = results.find((result) => result.error)?.error
  if (effectError) throw effectError
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
      return jsonResponse({ processed: false, message: 'No queued automation jobs are ready.' })
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

      return jsonResponse({
        processed: true,
        message: `${job.job_label} processed by Edge Function.`,
        job: {
          id: job.id,
          type: job.job_type,
          label: job.job_label,
          status: 'completed',
          applicantName: job.applicants?.full_name ?? 'Unknown applicant',
        },
      })
    } catch (processError) {
      await supabase
        .from('automation_jobs')
        .update({
          job_status: 'failed',
          last_error: processError.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      await updateWorkflowAfterJob(supabase, job.workflow_run_id)
      throw processError
    }
  } catch (error) {
    return jsonResponse({ processed: false, error: error.message }, 500)
  }
})
