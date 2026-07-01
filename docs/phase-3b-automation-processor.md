# Phase 3B - Automation Processor Placeholder

Phase 3B makes the automation queue actionable without connecting live providers yet.

## What Was Added

- Dashboard action: `Run next job`
- Dashboard run history panel:
  - recent automation events
  - processor source
  - provider marker
  - applicant and role context
- Edge Function-first processor flow:
  - dashboard calls `process-automation-jobs`
  - if the function is not deployed, the frontend uses the local demo fallback
  - keeps the demo working while the backend path is prepared
- Placeholder processor:
  - finds the next ready queued automation job
  - marks it `running`
  - simulates provider work
  - writes an automation event
  - marks the job `completed`
  - updates workflow run status
  - refreshes the dashboard

## Current Simulated Job Effects

- `send_confirmation_sms`
  - marks queued SMS notification as `sent`
  - writes a confirmation SMS automation event

- `send_confirmation_email`
  - sends through Resend when `RESEND_API_KEY` is configured
  - sends branded HTML plus plain-text email content
  - otherwise records a placeholder send
  - marks queued email notification as `sent`
  - writes a confirmation email automation event

- `parse_resume`
  - marks job complete
  - can move a `New Applicant` to `Resume Screened`
  - writes stage history and automation event

- `send_ai_assessment`
  - marks queued email notification as `sent`
  - writes AI assessment sent event

- `verify_license`
  - marks applicant license status as `Verified`
  - moves applicant to `License Verified`
  - writes stage history and automation event

## Edge Function

The folder `supabase/functions/process-automation-jobs/` contains the deploy-ready placeholder function.

Deployment notes live in `docs/supabase-edge-functions.md`.

## Still Placeholder Or Partial Integrations

- No real SMS provider call.
- Email can send through Resend after function deployment and secret setup.
- No OpenAI resume parsing yet.
- No live license database check.
- No voice interview provider.
- No calendar/scheduling provider.

Those integrations should be added behind Supabase Edge Functions or another backend service using environment variables.
