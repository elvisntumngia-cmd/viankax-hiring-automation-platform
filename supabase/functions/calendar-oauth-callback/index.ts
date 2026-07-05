import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function htmlResponse(message: string, status = 200) {
  return new Response(
    `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:32px;line-height:1.6;"><h1>ViankaX Calendar Connection</h1><p>${message}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } },
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function providerSecrets(provider: string) {
  if (provider === 'google') {
    return {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID'),
      clientSecret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET'),
    }
  }

  if (provider === 'microsoft') {
    return {
      tokenUrl: `https://login.microsoftonline.com/${Deno.env.get('MICROSOFT_TENANT_ID') ?? 'common'}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      clientId: Deno.env.get('MICROSOFT_CALENDAR_CLIENT_ID'),
      clientSecret: Deno.env.get('MICROSOFT_CALENDAR_CLIENT_SECRET'),
    }
  }

  throw new Error('Unsupported calendar provider.')
}

async function exchangeCodeForToken(provider: string, code: string) {
  const secrets = providerSecrets(provider)
  const callbackUrl = Deno.env.get('CALENDAR_OAUTH_CALLBACK_URL')

  if (!secrets.clientId || !secrets.clientSecret || !callbackUrl) {
    throw new Error(`${provider} OAuth secrets are not configured.`)
  }

  const body = new URLSearchParams({
    client_id: secrets.clientId,
    client_secret: secrets.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: callbackUrl,
  })

  const response = await fetch(secrets.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.error_description ?? result?.error ?? `${provider} token exchange failed.`)
  }

  return result
}

async function fetchProviderEmail(provider: string, accessToken: string) {
  const secrets = providerSecrets(provider)
  const response = await fetch(secrets.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const result = await response.json()

  if (!response.ok) return null
  return result.email ?? result.userPrincipalName ?? result.mail ?? null
}

Deno.serve(async (request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase function environment variables.')
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const rawState = url.searchParams.get('state')
    const state = rawState ? JSON.parse(rawState) : {}
    const provider = String(state.provider ?? 'google')
    const returnTo = String(state.returnTo ?? '')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (!code) {
      await supabase.from('calendar_sync_logs').insert({
        provider,
        action: 'oauth_callback',
        sync_status: 'Missing code',
        message: `${provider} OAuth callback did not include an authorization code.`,
      })

      return htmlResponse(`Calendar authorization failed for ${provider}.`, 400)
    }

    const token = await exchangeCodeForToken(provider, code)
    const providerEmail = await fetchProviderEmail(provider, token.access_token)
    const expiresAt = token.expires_in
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null

    const { error: connectionError } = await supabase
      .from('calendar_connections')
      .upsert({
        provider,
        provider_account_email: providerEmail,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        scope: token.scope,
        expires_at: expiresAt,
        connection_status: 'Connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider' })

    if (connectionError) throw connectionError

    await supabase.from('calendar_sync_logs').insert({
      provider,
      action: 'oauth_callback',
      sync_status: 'Connected',
      message: `${provider} OAuth connected${providerEmail ? ` for ${providerEmail}` : ''}.`,
    })

    await supabase
      .from('calendar_settings')
      .update({
        [`${provider}_connection_status`]: 'Connected',
        updated_at: new Date().toISOString(),
      })
      .eq('settings_key', 'default')

    return htmlResponse(
      `Calendar connected for ${provider}${providerEmail ? ` (${providerEmail})` : ''}. You may return to ViankaX.${returnTo ? ` <a href="${returnTo}">Return to calendar</a>` : ''}`,
      200,
    )
  } catch (error) {
    return htmlResponse(errorMessage(error), 500)
  }
})
