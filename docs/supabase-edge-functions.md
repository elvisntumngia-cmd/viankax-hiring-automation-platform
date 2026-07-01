# Supabase Edge Functions

This project includes a deploy-ready placeholder automation processor:

- `supabase/functions/process-automation-jobs/index.ts`

The React dashboard now tries to call this Edge Function first. If it is not deployed yet, the app falls back to the local demo processor so development can continue.

## One-Time CLI Setup

Install or confirm Supabase CLI:

```powershell
supabase --version
```

Login:

```powershell
supabase login
```

Link this repo to the Supabase project:

```powershell
supabase link --project-ref ayoqzgsimmlblwuqdccs
```

## Deploy Function

From the project root:

```powershell
supabase functions deploy process-automation-jobs
```

## Required Secrets

Supabase automatically provides these to deployed functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not put the service role key in React or `.env.local`.

## Test From Dashboard

1. Open `/dashboard`.
2. Find `Automation job queue`.
3. Click `Run next job`.
4. If the Edge Function is deployed, it processes the job.
5. If not deployed, the frontend local fallback processes the job.

## Current Function Behavior

The function processes one queued job at a time and still uses placeholder logic:

- marks queued job as `running`
- simulates provider work
- updates notification records where applicable
- writes automation events
- updates stage history for resume/license jobs
- marks job `completed`
- updates workflow run status

Real Twilio, Resend, OpenAI, Vapi/Bland, and scheduling integrations come later.
