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

    await supabase.from('calendar_sync_logs').insert({
      provider,
      action: 'oauth_callback',
      sync_status: code ? 'Received code' : 'Missing code',
      message: code
        ? `${provider} OAuth callback received. Token exchange is intentionally scaffolded until provider secrets/storage are finalized.`
        : `${provider} OAuth callback did not include an authorization code.`,
    })

    await supabase
      .from('calendar_settings')
      .update({
        [`${provider}_connection_status`]: code ? 'Ready for token exchange' : 'Connection failed',
        updated_at: new Date().toISOString(),
      })
      .eq('settings_key', 'default')

    return htmlResponse(
      code
        ? `Calendar authorization code received for ${provider}. You may return to ViankaX.${returnTo ? ` <a href="${returnTo}">Return to calendar</a>` : ''}`
        : `Calendar authorization failed for ${provider}.`,
      code ? 200 : 400,
    )
  } catch (error) {
    return htmlResponse(errorMessage(error), 500)
  }
})
