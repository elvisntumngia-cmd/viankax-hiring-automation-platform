# ViankaX Final Integration Checklist

Use this after the app shell, automation runner, Vapi webhook, Resend, and Google Calendar scaffolds are deployed.

## Required Environment Variables

Frontend/Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SHOW_AUTOMATION_DEBUG=false` for normal HR mode

Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `VAPI_API_KEY`
- `VAPI_ASSISTANT_ID`
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_WEBHOOK_SECRET`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`

## Edge Functions To Deploy

Run from repo root after function changes:

```powershell
cd "C:\Users\elsii\OneDrive\Documents\VX"
supabase functions deploy process-automation-jobs --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy create-applicant-upload-url --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy public-application-submit --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy vapi-voice-webhook --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy calendar-oauth-start --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy calendar-oauth-callback --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy sync-calendar-events --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy calendar-disconnect --project-ref ayoqzgsimmlblwuqdccs
```

## External Integration Checks

Resend:

- Domain verified.
- Sender email verified.
- Candidate receives all 3 expected emails.
- HR email remains disabled for this stage.

Vapi:

- Assistant uses the correct webhook URL.
- Webhook secret matches Supabase secret.
- One call per applicant after candidate clicks voice trigger.
- Transcript, score, recommendation, and guardrail outcome appear in HR.

OpenAI:

- AI screening scores are generated.
- Voice transcript scoring penalizes nonsense, vague, or short answers.
- Bad voice candidate does not auto-schedule.

Google Calendar:

- OAuth connects.
- Scheduled final interviews create/sync events.
- HR dashboard shows sync status and event metadata.

## Production Hardening Before Client Pilot

- Replace permissive demo RLS with tenant-aware RLS.
- Add HR user roles and client/tenant scoping.
- Hide debug queue controls in production.
- Rotate any exposed test keys.
- Confirm storage buckets remain private.
- Confirm signed document URLs only generate for authorized HR users.
- Add monitoring for Edge Function failures and repeated job attempts.
