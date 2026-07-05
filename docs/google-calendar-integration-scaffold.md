# Google Calendar Integration Scaffold

The frontend and Supabase Edge Function scaffolds are installed. OAuth/token exchange is intentionally server-side only and requires provider credentials before activation.

## Supabase Functions

- `calendar-oauth-start`
- `calendar-oauth-callback`
- `sync-calendar-events`

## Implemented Behavior

- `calendar-oauth-start` creates the provider authorization URL when secrets are present.
- `calendar-oauth-callback` exchanges the authorization code for provider tokens and stores the connection server-side.
- `sync-calendar-events` creates, updates, or cancels Google Calendar events when a Google connection exists.
- If no provider connection exists, sync falls back to placeholder event IDs so demos continue working.

## Required Supabase Secrets

Set these before attempting real Google Calendar OAuth:

```powershell
supabase secrets set GOOGLE_CALENDAR_CLIENT_ID="your_google_client_id"
supabase secrets set GOOGLE_CALENDAR_CLIENT_SECRET="your_google_client_secret"
supabase secrets set CALENDAR_OAUTH_CALLBACK_URL="https://ayoqzgsimmlblwuqdccs.functions.supabase.co/calendar-oauth-callback"
```

Microsoft later:

```powershell
supabase secrets set MICROSOFT_CALENDAR_CLIENT_ID="your_microsoft_client_id"
supabase secrets set MICROSOFT_CALENDAR_CLIENT_SECRET="your_microsoft_client_secret"
supabase secrets set MICROSOFT_TENANT_ID="common"
```

## Current Production Boundary

Google Calendar event creation is implemented. Microsoft is scaffolded for OAuth but does not yet create real Outlook events.

## Deploy Commands

```powershell
supabase functions deploy calendar-oauth-start
supabase functions deploy calendar-oauth-callback
supabase functions deploy sync-calendar-events
```

## Database Setup

Run:

```sql
-- Supabase SQL Editor
-- docs/supabase-calendar-stage-wrap-up.sql
```

This creates:

- `calendar_settings`
- `calendar_connections`
- `calendar_sync_logs`
- calendar sync columns on `interview_schedules`

## Google Cloud Setup

1. Create a Google Cloud project.
2. Enable Google Calendar API.
3. Configure OAuth consent screen.
4. Create OAuth client credentials for web application.
5. Add redirect URI:
   `https://ayoqzgsimmlblwuqdccs.functions.supabase.co/calendar-oauth-callback`

## Security Notes

- Do not put Google/Microsoft secrets in frontend code.
- Token exchange and refresh token storage must happen in Supabase Edge Functions or another backend service.
- Store token records encrypted or in a backend-only table with strict RLS/service-role access.
- The current `calendar_connections` table is intentionally not given public read/write policies. Edge Functions use the service role key.
