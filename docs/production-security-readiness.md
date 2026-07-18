# ViankaX Production Security Readiness

This document separates demo behavior from production behavior so we can keep testing quickly without accidentally exposing a customer-ready system.

## Current Demo Mode

- HR routes are protected by Supabase Auth in the React app.
- Supabase Edge Functions use service-role secrets server-side.
- Public applicant routes can create applications, upload documents, and complete screening.
- Some RLS policies remain permissive so the live demo can be tested without a tenant/admin system.
- Manual automation controls are intended for debug/demo use only and should stay hidden unless `VITE_SHOW_AUTOMATION_DEBUG=true`.

## Before Customer Launch

1. Replace public demo RLS policies with tenant-aware policies.
2. Require authenticated HR users for applicant, automation, score, document, site, shift, calendar, and workflow reads.
3. Restrict applicant writes to only the application submission and screening completion flows.
4. Keep all document buckets private.
5. Generate signed document URLs from trusted server paths only.
6. Move HR/company settings updates behind authenticated HR/admin checks.
7. Add audit events for HR decisions, placement assignment, calendar updates, and settings changes.
8. Use separate Supabase projects or environments for local, demo, staging, and production.
9. Rotate exposed test keys before any customer pilot.
10. Keep `VITE_SHOW_AUTOMATION_DEBUG=false` on normal live HR demos and client environments.

## Secrets That Must Stay Server-Side

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `VAPI_API_KEY`
- `VAPI_WEBHOOK_SECRET`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- Microsoft OAuth client secret when enabled

## Production RLS Direction

Do not run a broad lock-down SQL script against the current demo until we add roles/tenants. The target model should be:

- Applicants can submit public applications.
- Applicants can read/update only their own status after a secure token or login is added.
- HR users can read and manage applicants for their client/tenant only.
- ViankaX admins can manage all tenants, workflows, and billing later.
- Edge Functions use service role for automation actions and write audit events.

## Storage Direction

- Buckets: `resumes`, `licenses`, `government-ids`, `certifications`.
- Keep buckets private.
- HR document viewing should use signed URLs.
- Applicants should upload only into a generated path tied to their applicant id.
- Files should not be directly public-readable in production.
