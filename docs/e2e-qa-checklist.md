# ViankaX End-to-End QA Checklist

Use this checklist after deploying frontend changes, Edge Functions, and any required SQL updates.

## Applicant Flow

1. Open the live site and go to `/jobs`.
2. Choose a job and submit a strong candidate application with a valid phone number.
3. Confirm the success page appears.
4. Confirm the applicant receives:
   - application received email
   - AI screening assessment email
5. Open the AI screening link and submit strong candidate answers.

## Automation Flow

Expected after screening:

1. Applicant stage moves to `Assessment Completed`.
2. AI screening score and recommendation appear in HR dashboard.
3. Vapi voice job becomes queued only for Strong/Moderate candidates.
4. Vapi call is created once after the candidate qualifies for voice screening.
5. Duplicate calls are not created for the same applicant if the runner fires multiple times.
6. After Vapi webhook completion:
   - voice interview status becomes `Complete`
   - voice score is visible
   - candidate stage becomes `Voice Interview Complete`
   - scheduling job is queued
7. Final interview schedule is created automatically.
8. Placement matches are generated.
9. Calendar sync shows `Ready to sync` or `Synced` depending on provider setup.

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
- Applicant detail page shows scores, AI recommendation, voice status, final interview, documents, automation queue, and placement recommendation.
- Calendar page shows scheduled final interviews.
- Settings page saves calendar defaults.

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
