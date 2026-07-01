# Phase 3B - Automation Processor Placeholder

Phase 3B-1 makes the automation queue actionable without connecting live providers yet.

## What Was Added

- Dashboard action: `Run next job`
- Frontend placeholder processor:
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

## Edge Function Scaffold

The folder `supabase/functions/process-automation-jobs/` contains a deployable starting point for moving this processor into Supabase Edge Functions.

The frontend currently uses the direct placeholder processor so the demo can work immediately without function deployment.

## Still Not Real Integrations

- No real SMS provider call.
- No real email provider call.
- No OpenAI resume parsing yet.
- No live license database check.
- No voice interview provider.
- No calendar/scheduling provider.

Those integrations should be added behind Supabase Edge Functions or another backend service using environment variables.
