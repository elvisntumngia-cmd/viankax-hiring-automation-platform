# ViankaX End-to-End QA Checklist

Use this checklist after deploying frontend changes, Edge Functions, and any required SQL updates.

## Applicant Flow

1. Open the live site and go to `/jobs`.
2. Choose a job and submit a strong candidate application with a valid phone number.
3. Confirm the success page appears.
4. Confirm the applicant receives:
   - email #1: application received + AI screening assessment link
5. Open the AI screening link and submit strong candidate answers.
6. Confirm the applicant receives email #2:
   - screening complete
   - voice interview trigger link
7. Open the voice trigger link and start the Vapi call.
8. Complete the Vapi call.
9. Confirm the applicant receives email #3:
   - final interview scheduled, when voice score passes guardrails
   - thank-you/we-will-be-in-touch follow-up, when guardrails block auto-scheduling

## Automation Flow

Expected after screening:

1. Applicant stage moves to `Assessment Completed`.
2. AI screening score and recommendation appear in HR dashboard.
3. Screening completion email is queued and sent.
4. Vapi voice job remains blocked until the candidate clicks the voice trigger link.
5. Vapi call is created once after the candidate clicks the voice trigger link.
6. Duplicate calls are not created for the same applicant if the runner fires multiple times.
7. Weak/nonsense voice answers route to HR review and do not auto-schedule.
8. Strong voice answers can release scheduling.
9. After Vapi webhook completion:
   - voice interview status becomes `Complete`
   - voice score is visible
   - candidate stage becomes `Voice Interview Complete`
   - scheduling job is queued only when guardrails pass
10. Final interview schedule is created automatically for strong candidates.
11. Placement matches are generated.
12. Calendar sync shows `Ready to sync` or `Synced` depending on provider setup.

## Candidate Email Flow

The expected candidate-only email sequence is:

1. `Your application was received - complete your screening`
   - Includes the AI screening link.
2. `Your ViankaX screening is complete`
   - Includes the voice interview trigger link when the candidate qualifies.
   - Tells the candidate HR will review when screening is not strong enough.
3. Final outcome email:
   - `Your final interview has been scheduled`, or
   - `Thank you for completing your ViankaX interview`.

No HR notification email should be sent in this stage.

## HR Dashboard

Check these pages:

- `/dashboard`
- `/dashboard/applicants`
- `/dashboard/applicants/:id`
- `/dashboard/calendar`
- `/dashboard/sites`
- `/dashboard/shifts`
- `/dashboard/settings`

Expected:

- Pipeline filters work.
- Applicant pipeline shows automation outcome per applicant.
- Applicant detail page shows scores, AI recommendation, voice status, final interview, documents, automation queue, and placement recommendation.
- Applicant detail page shows a plain-English automation outcome summary.
- Calendar page shows scheduled final interviews.
- Settings page saves calendar defaults.
- Manual `Run next job` control is hidden unless `VITE_SHOW_AUTOMATION_DEBUG=true`.

## Applicant Status Page

Check `/status` for:

- Application + screening email milestone.
- AI screening completed milestone.
- Voice trigger milestone.
- Voice interview completion and score.
- Final interview scheduled or final candidate follow-up email.
- Plain-English next step based on automation outcome.

## Edge Functions To Deploy After Code Changes

Run from the repo root:

```powershell
cd "C:\Users\elsii\OneDrive\Documents\VX"
supabase functions deploy process-automation-jobs --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy vapi-voice-webhook --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy sync-calendar-events --project-ref ayoqzgsimmlblwuqdccs
```

## Known Intentional Limits

- Production tenant/RLS lock-down is documented but not forced yet.
- Microsoft Calendar is scaffolded as integration-ready, not fully connected.
- Vapi completion depends on Vapi webhook delivery and the correct webhook URL/secret.
