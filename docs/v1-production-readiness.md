# ViankaX V1 Production Readiness

This project is V1 demo-ready. The remaining work is mainly external provider connection, production security hardening, and final QA.

## Completed V1 Flow

- Public job browsing and job detail pages
- Multi-step applicant application
- Supabase applicant record creation
- Supabase Storage document upload
- Confirmation and AI screening email queue
- AI screening page with structured answers and scoring
- Automation job processor Edge Function
- HR dashboard, applicant pipeline, applicant detail page
- Candidate scores and AI recommendation display
- Sites, open shifts, and jobs management
- Placement recommendation UI
- HR assignment to recommended site/open shift
- Final interview scheduling records
- Calendar dashboard with settings, reschedule, cancel, sync controls
- Google Calendar OAuth/sync foundation
- Applicant status portal
- Protected dashboard routes

## Real Integrations Still To Connect Together

- Microsoft Outlook Calendar
- Production Google OAuth verification
- Optional Twilio SMS
- Optional Calendly/Cal.com scheduling links

OpenAI screening is now wired through Supabase Edge Functions. It still requires `OPENAI_API_KEY` in Supabase secrets before it can produce live AI output.
Vapi voice interviews are now wired through Supabase Edge Functions. They still require Vapi secrets, the Vapi SQL migration, and Edge Function deployment before live calls happen.

## Supabase Edge Functions

Deploy or redeploy these whenever their source changes:

```powershell
supabase functions deploy process-automation-jobs
supabase functions deploy evaluate-ai-screening
supabase functions deploy vapi-voice-webhook
supabase functions deploy sync-calendar-events
supabase functions deploy calendar-oauth-start
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-disconnect
```

## Frontend Environment Variables

Set these in local `.env.local` and Vercel:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase Secrets

Set provider secrets in Supabase, never in frontend code:

```powershell
supabase secrets set RESEND_API_KEY=""
supabase secrets set RESEND_FROM_EMAIL="ViankaX Hiring <verified@yourdomain.com>"
supabase secrets set RESEND_REPLY_TO="hr@yourdomain.com"
supabase secrets set APP_BASE_URL="https://your-production-domain.com"
supabase secrets set GOOGLE_CALENDAR_CLIENT_ID=""
supabase secrets set GOOGLE_CALENDAR_CLIENT_SECRET=""
supabase secrets set MICROSOFT_CALENDAR_CLIENT_ID=""
supabase secrets set MICROSOFT_CALENDAR_CLIENT_SECRET=""
supabase secrets set MICROSOFT_TENANT_ID="common"
supabase secrets set OPENAI_API_KEY=""
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
supabase secrets set VAPI_API_KEY=""
supabase secrets set VAPI_ASSISTANT_ID=""
supabase secrets set VAPI_PHONE_NUMBER_ID=""
supabase secrets set VAPI_WEBHOOK_SECRET=""
supabase secrets set BLAND_API_KEY=""
supabase secrets set BLAND_PHONE_NUMBER_ID=""
```

## Production Security Hardening

Before onboarding real clients:

- Replace demo-permissive RLS policies with tenant-scoped policies.
- Add HR/client role records and enforce `client_id` access.
- Keep applicant status lookup restricted to email + phone or signed status links.
- Keep all AI, calendar, email, SMS, and voice provider calls in Edge Functions.
- Remove or disable local dummy fallback data for production builds.
- Add audit logging for HR assignment, rejection, hired, and calendar updates.

## Demo Script

1. Visit `/jobs`.
2. Open a job and submit an application.
3. Confirm success page.
4. Confirm applicant appears in `/dashboard/applicants`.
5. Complete `/screening/:applicantId`.
6. Open applicant detail.
7. Review scores, documents, AI screening, voice placeholder, placement recommendation, and final interview.
8. Open `/dashboard/calendar`.
9. Sync calendar events.
10. Assign candidate to the recommended shift.
11. Confirm assigned candidate appears on `/dashboard/sites` and `/dashboard/shifts`.

## Known V1 Limitations

- Demo automation timing is intentionally fast. AI screening invites and retry checks run seconds apart for demos; production should use calmer retry windows and a scheduled runner.
- Voice interview uses Vapi when secrets and webhook deployment are complete; otherwise it safely falls back to placeholder behavior.
- OpenAI scoring requires Supabase secrets and Edge Function deployment before live model output appears.
- Microsoft Calendar is scaffolded but not completed.
- Google OAuth may require production verification before external users can connect.
- Demo RLS policies should not be used for real customer data.
