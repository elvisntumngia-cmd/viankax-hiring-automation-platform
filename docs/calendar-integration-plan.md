# Calendar Integration Plan

The internal calendar is now the source of truth for final in-person interviews.

## Current State

- HR can view scheduled final interviews at `/dashboard/calendar`.
- Applicant detail pages show final interview status, provider, date/time, and scheduling link.
- The dashboard home shows upcoming final interviews.
- The app works with the current Supabase schema.

## Supabase Fields For Provider Sync

Run `docs/supabase-calendar-stage-wrap-up.sql` to install all calendar settings and sync fields in one pass.

These fields prepare `interview_schedules` for Google Calendar and Microsoft Outlook:

- `external_calendar_provider`
- `external_event_id`
- `sync_status`
- `sync_error`
- `synced_at`

## Google Calendar / Microsoft Outlook Flow

1. Automation schedules the final interview internally.
2. Server-side integration creates the external calendar event.
3. Provider event ID is saved to `interview_schedules.external_event_id`.
4. Sync status updates to `Synced` or `Failed`.
5. HR can still view all interviews inside ViankaX even if provider sync fails.

## Current Automation Behavior

- The automation runner reads `calendar_settings`.
- New final interviews inherit the configured provider, interviewer email, duration, buffer, and scheduling window.
- Google/Microsoft providers are marked `Ready to sync` until OAuth/provider sync is connected.
- Provider connection status, availability rules, reschedule/cancel actions, and sync logs are now modeled.

## Remaining Real Provider Work

Google and Microsoft OAuth must be implemented server-side only:

- Store OAuth tokens outside frontend code.
- Create/update/cancel provider events from Supabase Edge Functions.
- Write provider IDs to `interview_schedules.external_event_id`.
- Write every attempt to `calendar_sync_logs`.
- Send candidate/interviewer invite emails after provider sync succeeds or internal scheduling is confirmed.

## Calendar Invite Email Payload

Future invite emails should include:

- Candidate name
- Role applied for
- Final interview date/time
- Interviewer email
- Duration and buffer
- Placement recommendation
- Applicant profile link for HR
- Candidate-facing confirmation text

## Availability Rules

The current settings support:

- Business hours start/end
- Weekend allowance
- Max interviews per day
- Interview duration
- Buffer between interviews

The next scheduling algorithm can use these fields before selecting a final time.

## Security Rules

- Do not expose Google or Microsoft secrets in frontend code.
- OAuth tokens must be stored server-side.
- Calendar event creation should happen in Supabase Edge Functions or another backend service.
