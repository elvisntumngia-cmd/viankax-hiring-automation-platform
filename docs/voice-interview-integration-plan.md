# Voice Interview Integration Plan

ViankaX now has a Vapi-ready voice interview flow. The automation engine can create a Vapi outbound call when Vapi secrets are configured, receive completion data through a webhook, store transcript/score/recommendation, and continue to final interview scheduling.

## Real Provider Hook

Backend-only scaffold:

- `supabase/functions/_shared/voice-interview-provider.ts`
- `supabase/functions/vapi-voice-webhook/index.ts`

Do not call Vapi or Bland from frontend React code. Provider API keys must stay in Supabase Edge Function secrets.

## Required Secrets

For Vapi:

- `VAPI_API_KEY`
- `VAPI_ASSISTANT_ID`
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_WEBHOOK_SECRET` optional but recommended

For Bland:

- `BLAND_API_KEY`
- `BLAND_PHONE_NUMBER_ID`

## Next Implementation Step

Run the SQL migration:

```powershell
# Copy and run docs/supabase-vapi-voice-integration.sql in Supabase SQL Editor
```

Deploy functions:

```powershell
supabase functions deploy process-automation-jobs
supabase functions deploy vapi-voice-webhook
```

Set secrets:

```powershell
supabase secrets set VAPI_API_KEY=""
supabase secrets set VAPI_ASSISTANT_ID=""
supabase secrets set VAPI_PHONE_NUMBER_ID=""
supabase secrets set VAPI_WEBHOOK_SECRET=""
```

## Current Implementation

1. `voice_interview_analysis` creates a Vapi call when Vapi secrets are set.
2. The call includes a server URL pointing to `vapi-voice-webhook`.
3. The webhook updates `voice_interviews`, `candidate_scores`, applicant stage/status, automation events, and wakes the scheduling job.
4. If Vapi secrets are missing, the function uses a clearly marked placeholder completion so demos still work.

## Future Enhancements

1. Configure a dedicated ViankaX Vapi assistant prompt.
2. Add Vapi structured outputs or scorecards for communication, professionalism, confidence, availability, and scenario readiness.
3. Add stronger webhook signature verification once Vapi account settings are finalized.
4. Add retry handling for failed outbound calls.

