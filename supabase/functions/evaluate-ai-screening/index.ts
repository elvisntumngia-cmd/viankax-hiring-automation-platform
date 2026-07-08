import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { evaluateAiScreening } from '../_shared/openai-screening.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function buildScreeningContext(supabase: ReturnType<typeof createClient>, applicantId: string) {
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

    const body = await request.json().catch(() => ({}))
    const applicantId = body?.applicantId

    if (!applicantId || typeof applicantId !== 'string') {
      throw new Error('applicantId is required.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const context = await buildScreeningContext(supabase, applicantId)
    const evaluation = await evaluateAiScreening(context)

    return jsonResponse({
      ok: true,
      applicantId,
      evaluation,
    })
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500)
  }
})
