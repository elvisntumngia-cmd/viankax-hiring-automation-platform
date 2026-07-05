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

function providerConfig(provider: string) {
  const normalized = provider.toLowerCase()

  if (normalized === 'google') {
    return {
      provider: 'google',
      clientId: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID'),
      authBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scope: 'https://www.googleapis.com/auth/calendar.events',
    }
  }

  if (normalized === 'microsoft') {
    return {
      provider: 'microsoft',
      clientId: Deno.env.get('MICROSOFT_CALENDAR_CLIENT_ID'),
      authBaseUrl: `https://login.microsoftonline.com/${Deno.env.get('MICROSOFT_TENANT_ID') ?? 'common'}/oauth2/v2.0/authorize`,
      scope: 'offline_access Calendars.ReadWrite User.Read',
    }
  }

  throw new Error('Unsupported calendar provider.')
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
    const provider = String(body?.provider ?? 'google')
    const redirectTo = String(body?.redirectTo ?? '')
    const config = providerConfig(provider)
    const callbackUrl = Deno.env.get('CALENDAR_OAUTH_CALLBACK_URL')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await supabase.from('calendar_sync_logs').insert({
      provider: config.provider,
      action: 'oauth_start',
      sync_status: config.clientId && callbackUrl ? 'Ready' : 'Missing configuration',
      message: config.clientId && callbackUrl
        ? `${config.provider} OAuth start generated.`
        : `${config.provider} OAuth requires provider client ID and callback URL secrets.`,
    })

    if (!config.clientId || !callbackUrl) {
      return jsonResponse({
        ready: false,
        provider: config.provider,
        message: `${config.provider} OAuth scaffold is installed. Add provider client ID and CALENDAR_OAUTH_CALLBACK_URL secrets to enable redirect.`,
      })
    }

    const state = crypto.randomUUID()
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: config.scope,
      access_type: 'offline',
      prompt: 'consent',
      state: JSON.stringify({ provider: config.provider, returnTo: redirectTo, nonce: state }),
    })

    return jsonResponse({
      ready: true,
      provider: config.provider,
      authorizationUrl: `${config.authBaseUrl}?${params.toString()}`,
      message: `${config.provider} OAuth redirect is ready.`,
    })
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500)
  }
})
