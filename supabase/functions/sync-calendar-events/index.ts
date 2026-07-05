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

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: schedules, error } = await supabase
      .from('interview_schedules')
      .select('id, applicant_id, provider, scheduled_for, status, sync_status, external_event_id')
      .in('sync_status', ['Ready to sync', 'Update Ready to Sync', 'Cancel Ready to Sync'])
      .limit(25)

    if (error) throw error

    const processed = []

    for (const schedule of schedules ?? []) {
      const provider = schedule.provider ?? 'internal_calendar'
      const externalEventId = schedule.external_event_id ?? `vx-placeholder-${schedule.id}`
      const nextSyncStatus = schedule.sync_status === 'Cancel Ready to Sync' ? 'Cancel Synced' : 'Synced'

      const { error: scheduleError } = await supabase
        .from('interview_schedules')
        .update({
          external_event_id: externalEventId,
          sync_status: nextSyncStatus,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id)

      if (scheduleError) throw scheduleError

      await supabase.from('calendar_sync_logs').insert({
        applicant_id: schedule.applicant_id,
        interview_schedule_id: schedule.id,
        provider,
        action: schedule.sync_status === 'Cancel Ready to Sync' ? 'cancel_sync' : 'event_sync',
        sync_status: nextSyncStatus,
        provider_event_id: externalEventId,
        message: 'Placeholder provider sync completed. Replace with Google/Microsoft API call after OAuth token storage is active.',
      })

      processed.push({ id: schedule.id, provider, syncStatus: nextSyncStatus })
    }

    return jsonResponse({
      processed: processed.length > 0,
      processedCount: processed.length,
      message: processed.length
        ? `Synced ${processed.length} pending calendar event${processed.length === 1 ? '' : 's'} with placeholder provider IDs.`
        : 'No pending calendar events are ready to sync.',
      events: processed,
    })
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500)
  }
})
