# OpenAI AI Engine

ViankaX now has a backend-only OpenAI screening evaluator.

## What It Does

The automation job `evaluate_ai_assessment` now calls the Supabase Edge Function processor, which evaluates completed AI screening answers using OpenAI when `OPENAI_API_KEY` is configured.

It generates:

- Eligibility Score
- Availability Score
- Transportation Score
- Experience Score
- Site Readiness Score
- Communication Score
- Overall Screening Score
- Screening Recommendation
- AI Summary
- Strengths
- Concerns
- Suggested Next Step
- Placement signals for site/open-shift matching

## Files

- `supabase/functions/_shared/openai-screening.ts`
- `supabase/functions/evaluate-ai-screening/index.ts`
- `supabase/functions/process-automation-jobs/index.ts`

## Required Supabase Secrets

```powershell
supabase secrets set OPENAI_API_KEY="your_openai_api_key"
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
```

`OPENAI_MODEL` is optional. If omitted, the function defaults to `gpt-4.1-mini`.

## Deploy Commands

```powershell
supabase functions deploy evaluate-ai-screening
supabase functions deploy process-automation-jobs
```

## Safe Fallback

If `OPENAI_API_KEY` is not configured, the evaluator returns a clearly marked placeholder result so the demo workflow continues. Once the secret is set and the functions are redeployed, the same automation path uses OpenAI.

## Security Rule

Never put `OPENAI_API_KEY` in React, Vite, or any frontend `.env` file. Keep it only in Supabase secrets.

