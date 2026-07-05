import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const provider = String(body?.provider ?? 'google').toLowerCase()
    if (!['google', 'microsoft'].includes(provider)) throw new Error('Unsupported calendar provider.')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('provider', provider)

    if (deleteError && deleteError.code !== '42P01') throw deleteError

    await supabase
      .from('calendar_settings')
      .update({
        [`${provider}_connection_status`]: 'Not connected',
        updated_at: new Date().toISOString(),
      })
      .eq('settings_key', 'default')

    await supabase.from('calendar_sync_logs').insert({
      provider,
      action: 'disconnect',
      sync_status: 'Disconnected',
      message: `${provider} calendar connection removed.`,
    })

    return jsonResponse({
      disconnected: true,
      provider,
      message: `${provider} calendar disconnected.`,
    })
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500)
  }
})
