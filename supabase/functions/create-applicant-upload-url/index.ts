import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const documentDefinitions: Record<string, { documentType: string; bucket: string }> = {
  resume: { documentType: 'resume', bucket: 'resumes' },
  guardCard: { documentType: 'license', bucket: 'licenses' },
  governmentId: { documentType: 'government_id', bucket: 'government-ids' },
  cpr: { documentType: 'cpr', bucket: 'certifications' },
  firstAid: { documentType: 'first_aid', bucket: 'certifications' },
  firearms: { documentType: 'firearms', bucket: 'certifications' },
}

const maxUploadBytes = 10 * 1024 * 1024

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ''))
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-z0-9.\-_]/gi, '-').toLowerCase()
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Upload signing is not configured.' }, 500)
  }

  const body = await request.json().catch(() => null)
  const applicantId = body?.applicantId
  const documentKey = String(body?.documentKey ?? '')
  const fileName = String(body?.fileName ?? '')
  const fileSize = Number(body?.fileSize ?? 0)
  const definition = documentDefinitions[documentKey]

  if (!isUuid(applicantId)) {
    return jsonResponse({ error: 'A valid applicant id is required.' }, 400)
  }

  if (!definition) {
    return jsonResponse({ error: 'Unsupported document type.' }, 400)
  }

  if (!fileName) {
    return jsonResponse({ error: 'File name is required.' }, 400)
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxUploadBytes) {
    return jsonResponse({ error: 'Files must be 10 MB or smaller.' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const storagePath = `${applicantId}/${definition.documentType}-${Date.now()}-${safeFileName(fileName)}`

  const { data, error } = await supabase.storage.from(definition.bucket).createSignedUploadUrl(storagePath)

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({
    bucket: definition.bucket,
    path: data.path,
    token: data.token,
  })
})
