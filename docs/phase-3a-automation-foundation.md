# Phase 3A - Automation Foundation

Phase 3A adds the backend structure for ViankaX's automation engine without connecting live third-party services yet.

## Added Tables

- `workflow_runs`
  - One hiring workflow instance per applicant.
  - Tracks workflow name, status, current step, start/completion time, and metadata.

- `automation_jobs`
  - Queue of backend tasks to be processed by future worker functions.
  - Examples: confirmation SMS, resume parsing, AI assessment invite, license verification, scheduling link.

- `notification_queue`
  - Outbound SMS/email records.
  - Keeps messages queued until Twilio, Resend, SMTP, or another provider is connected.

## Current Frontend Behavior

- New application submissions create:
  - applicant record
  - scores
  - recommendation placeholder
  - documents
  - automation events
  - workflow run
  - automation jobs
  - notification queue records

- HR dashboard shows:
  - automation job queue
  - queued/running/blocked/completed/failed counts
  - applicant, role, stage, priority, attempts, and scheduled time

- Applicant detail page shows:
  - applicant-specific automation queue
  - workflow run details
  - queued notifications

## Not Included Yet

- No real SMS sending.
- No real email sending.
- No OpenAI API call.
- No voice interview provider call.
- No scheduling provider call.

Those are Phase 3B/4 integration steps and should run through Supabase Edge Functions or another backend layer so API keys are never exposed in frontend code.

## Supabase Step

Run these files in Supabase SQL Editor after pulling this stage:

1. `docs/supabase-schema.sql`
2. `docs/supabase-seed.sql`

The schema file is rerunnable. The seed file resets demo queue records for the five sample applicants.
