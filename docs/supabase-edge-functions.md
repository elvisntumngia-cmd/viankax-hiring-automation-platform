# Supabase Edge Functions

This project includes a deploy-ready placeholder automation processor:

- `supabase/functions/process-automation-jobs/index.ts`

The React dashboard now tries to call this Edge Function first. If it is not deployed yet, the app falls back to the local demo processor so development can continue.

## One-Time CLI Setup

Install or confirm Supabase CLI:

```powershell
supabase --version
```

If PowerShell says `supabase` is not recognized, install the CLI first. One simple option is:

```powershell
npm install -g supabase
```

Login:

```powershell
supabase login
```

If you are running inside a non-interactive terminal and login fails, create a Supabase access token in the Supabase dashboard, then run:

```powershell
supabase login --token "your_supabase_access_token"
```

Link this repo to the Supabase project:

```powershell
cd "C:\Users\elsii\OneDrive\Documents\VX"
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

## Optional Resend Email Secrets

To send real confirmation emails instead of placeholder sends:

```powershell
supabase secrets set RESEND_API_KEY="your_resend_api_key"
supabase secrets set RESEND_FROM_EMAIL="ViankaX Hiring <your_verified_sender@yourdomain.com>"
supabase secrets set RESEND_REPLY_TO="your_reply_to@yourdomain.com"
```

Notes:

- The sender must be verified in Resend.
- `RESEND_REPLY_TO` is optional, but useful when candidates reply.
- If `RESEND_API_KEY` is missing, the function still completes using placeholder email behavior.

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
- sends real email through Resend only when `RESEND_API_KEY` is configured
- sends branded HTML and plain-text email content
- writes automation events
- updates stage history for resume/license jobs
- marks job `completed`
- updates workflow run status

Real Twilio, OpenAI, Vapi/Bland, and scheduling integrations come later. Resend email is ready once the function is deployed and the Resend secrets are set.
