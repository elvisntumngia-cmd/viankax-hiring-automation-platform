# Google Calendar Integration Scaffold

The frontend and Supabase Edge Function scaffolds are installed. OAuth/token exchange is intentionally server-side only and requires provider credentials before activation.

## Supabase Functions

- `calendar-oauth-start`
- `calendar-oauth-callback`
- `sync-calendar-events`

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

## Deploy Commands

```powershell
supabase functions deploy calendar-oauth-start
supabase functions deploy calendar-oauth-callback
supabase functions deploy sync-calendar-events
```

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
