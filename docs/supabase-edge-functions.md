# Supabase Edge Functions

This project includes deploy-ready automation Edge Functions:

- `supabase/functions/process-automation-jobs/index.ts`
- `supabase/functions/evaluate-ai-screening/index.ts`
- `supabase/functions/vapi-voice-webhook/index.ts`

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
supabase functions deploy evaluate-ai-screening
supabase functions deploy vapi-voice-webhook
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

## Optional OpenAI Screening Secrets

To use live OpenAI evaluation instead of the safe fallback evaluator:

```powershell
supabase secrets set OPENAI_API_KEY="your_openai_api_key"
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
```

Notes:

- `OPENAI_MODEL` is optional.
- Keep `OPENAI_API_KEY` only in Supabase secrets.
- The dashboard/front-end never calls OpenAI directly.

## Optional Vapi Voice Interview Secrets

To create real Vapi voice interviews instead of placeholder voice results:

```powershell
supabase secrets set VAPI_API_KEY="your_vapi_api_key"
supabase secrets set VAPI_ASSISTANT_ID="your_vapi_assistant_id"
supabase secrets set VAPI_PHONE_NUMBER_ID="your_vapi_phone_number_id"
supabase secrets set VAPI_WEBHOOK_SECRET="your_shared_webhook_secret"
```

Run `docs/supabase-vapi-voice-integration.sql` in Supabase before testing live Vapi calls.

## Test From Dashboard

1. Open `/dashboard`.
2. Find `Automation job queue`.
3. Click `Run next job`.
4. If the Edge Function is deployed, it processes the job.
5. If not deployed, the frontend local fallback processes the job.

If the dashboard says `No queued automation jobs are ready` but `notification_queue` still has queued email rows, redeploy the latest function. The processor now recovers queued email notifications that are missing a ready automation job.

## Current Function Behavior

The function processes queued jobs and uses real integrations where configured:

- marks queued job as `running`
- evaluates AI screening with OpenAI when `OPENAI_API_KEY` is configured
- creates Vapi voice interview calls when Vapi secrets are configured
- accepts Vapi completion webhooks at `vapi-voice-webhook`
- uses safe placeholder behavior when provider keys are missing
- updates notification records where applicable
- sends real email through Resend only when `RESEND_API_KEY` is configured
- sends branded HTML and plain-text email content
- writes automation events
- updates stage history for resume/license jobs
- marks jobs `completed`
- updates workflow run status

Real Twilio comes later. Resend, OpenAI, and Vapi are ready once the functions are deployed, SQL migrations are run, and the required secrets are set.
