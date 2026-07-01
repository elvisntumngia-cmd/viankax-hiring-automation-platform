import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      .select('id, applicant_id, workflow_run_id, job_type, job_label, attempts')
      .eq('job_status', 'queued')
      .lte('scheduled_for', now)
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(1)

    if (jobError) throw jobError
    const job = jobs?.[0]

    if (!job) {
      return Response.json(
        { processed: false, message: 'No queued automation jobs are ready.' },
        { headers: corsHeaders },
      )
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

    const { error: eventError } = await supabase
      .from('automation_events')
      .insert({
        applicant_id: job.applicant_id,
        event_type: 'edge_function_placeholder_processed',
        event_status: 'complete',
        event_label: 'Edge Function Placeholder Processed',
        metadata: {
          automationJobId: job.id,
          jobType: job.job_type,
          description: 'Supabase Edge Function placeholder processed this queued job.',
        },
      })

    if (eventError) throw eventError

    const { error: completedError } = await supabase
      .from('automation_jobs')
      .update({
        job_status: 'completed',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (completedError) throw completedError

    return Response.json(
      {
        processed: true,
        message: `${job.job_label} processed by Edge Function placeholder.`,
        jobId: job.id,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    return Response.json(
      { processed: false, error: error.message },
      { status: 500, headers: corsHeaders },
    )
  }
})
