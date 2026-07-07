# Voice Interview Integration Plan

ViankaX V1 currently uses a clearly marked placeholder voice interview flow. The automation engine can move a qualified applicant through voice analysis, create a sample transcript, generate a voice score, and continue to final interview scheduling.

## Real Provider Hook

Backend-only scaffold:

- `supabase/functions/_shared/voice-interview-provider.ts`

Do not call Vapi or Bland from frontend React code. Provider API keys must stay in Supabase Edge Function secrets.

## Required Secrets

For Vapi:

- `VAPI_API_KEY`
- `VAPI_ASSISTANT_ID`
- `VAPI_PHONE_NUMBER_ID`

For Bland:

- `BLAND_API_KEY`
- `BLAND_PHONE_NUMBER_ID`

## Next Implementation Step

Replace the placeholder `voice_interview_analysis` branch in `process-automation-jobs` with:

1. Create provider call or interview link.
2. Save provider call id and interview URL to `voice_interviews`.
3. Queue or wait for provider webhook.
4. On webhook completion, save transcript, voice score, recommendation, and move applicant to scheduling.

## Current V1 Demo Behavior

The placeholder flow is intentional and safe for demo:

- No external voice provider is called.
- No voice API keys are exposed.
- HR can still see status, transcript, score, recommendation, and final interview scheduling.

