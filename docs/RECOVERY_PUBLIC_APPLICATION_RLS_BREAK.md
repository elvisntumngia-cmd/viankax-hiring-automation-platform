# Recovery: Public Application RLS Break

Date: 2026-07-20

## Situation

Public application submission started failing after the audit/tenant-security work:

```text
new row violates row-level security policy for table "applicants"
```

This did not fail at the last known working checkpoint.

## Last Known-Good Code Checkpoint

Git commit:

```text
5f02aea Improve responsive app scaling
```

This is also `origin/main` at the time of this note.

## What Changed After The Last Good Commit

All of these changes are currently uncommitted:

### Frontend

- `apps/web/src/App.jsx`
- `apps/web/src/components/ProtectedRoute.jsx`
- `apps/web/src/hooks/useOrganization.js`
- `apps/web/src/pages/AiScreeningPage.jsx`
- `apps/web/src/pages/ApplicationPage.jsx`
- `apps/web/src/pages/ApplicationStatusPage.jsx`
- `apps/web/src/pages/VoiceInterviewTriggerPage.jsx`
- `apps/web/src/services/supabaseData.js`

### Edge Functions

- `supabase/functions/process-automation-jobs/index.ts`
- `supabase/functions/applicant-workflow/index.ts`
- `supabase/functions/public-application-submit/index.ts`

### Database / SQL

- `supabase/migrations/202607190001_multi_tenant_foundation.sql`
- `supabase/migrations/202607190002_tenant_rls_policies.sql`
- `supabase/migrations/202607190003_storage_security.sql`
- `supabase/migrations/202607190004_applicant_access_tokens.sql`
- `supabase/migrations/202607190005_public_applicant_uploads.sql`
- `supabase/migrations/202607190006_public_application_intake_records.sql`
- `docs/supabase-create-demo-hr-membership.sql`
- `docs/supabase-debug-and-unblock-applicant-insert.sql`
- `docs/supabase-fix-public-applicant-org-trigger.sql`
- `docs/supabase-public-applicant-submit-rpc.sql`

## Most Likely Break Source

The breaking change is not the visual app scaling commit. The break almost certainly came from applying strict tenant RLS and then changing public application submission to work around it.

The pre-security app used direct browser inserts into:

- `applicants`
- `candidate_scores`
- `ai_recommendations`
- `automation_events`
- `ai_screening_tasks`
- `screening_answers`
- `applicant_documents`
- `automation_jobs`
- `notification_queue`
- `workflow_runs`

Once strict RLS was applied, the public browser was no longer a good actor for these writes.

## Why The Recent Fixes Did Not Solve It

Several patches tried to keep the frontend doing public writes while adjusting policies or using an RPC. That is fragile because:

- Public users should not have broad insert/select/update rights across hiring workflow tables.
- RLS policies can still block direct browser writes even when helper functions look correct.
- The live app may not always be running the latest frontend bundle or Edge Function.
- Downstream child-record writes would likely fail even after the applicant row succeeds.

## Correct Recovery Strategy

There are two safe paths.

### Path A: Fast Restore Demo Stability

Goal: get public applications working again quickly.

1. Revert the live Supabase policies for applicant intake to the previous demo-permissive model.
2. Revert frontend submission back to the last known-good direct insert flow from commit `5f02aea`.
3. Keep tenant-security SQL files in the repo as planning artifacts, but do not apply them to live until the full service-role submission flow is ready.

Use this if the priority is restoring the demo/live app immediately.

### Path B: Production-Correct Fix

Goal: keep strict RLS and make public intake production-safe.

1. Move the entire public application submission flow into a single service-role Edge Function.
2. The Edge Function must create all intake records in one controlled operation:
   - applicant
   - document records
   - screening answers
   - candidate scores
   - AI recommendation placeholder
   - workflow run
   - automation jobs
   - notification queue
   - automation events
3. The browser should only:
   - collect form data
   - upload files through signed upload URLs or the Edge Function
   - call the Edge Function once
4. Do not let the browser write directly to workflow tables under strict RLS.

Use this for production readiness, but it requires more careful implementation and testing.

## Morning Recommendation

Start with Path A to restore the app to the last working demo behavior, then create a new branch/checkpoint for Path B.

Do not continue stacking RLS hotfixes on the live path. Walk back the tenant-security application first, stabilize, then rebuild public intake behind one Edge Function.

## Concrete Morning Steps

### 1. Restore database demo policies

Run:

```text
docs/supabase-restore-demo-permissive-policies.sql
```

This should undo the live impact of strict tenant RLS for demo intake and restore the public insert/update/select policies used by the working app.

### 2. Restore frontend submission code to last-good behavior

The most important frontend file is:

```text
apps/web/src/services/supabaseData.js
```

Walk back `submitApplicationToSupabase` to commit `5f02aea` behavior:

- direct insert into `applicants`
- `.select('id')`
- upload path `applicant_id/document-type-file`
- no `organizationId` requirement
- child rows do not need explicit `organization_id`

### 3. Keep useful non-breaking changes only after demo is stable

Potentially keep later:

- tokenized applicant workflow links
- applicant status token route
- production tenant migration files as drafts

Do not keep until retested:

- `useOrganization` protected-route enforcement
- tenant filtering in all HR fetches
- tenant storage path changes
- public application Edge Function rewrite
- strict RLS migration applied to live demo

### 4. Test one simple applicant

Use a known open demo job:

- Security Officer
- Unarmed Security Officer
- Shift supervisor

Expected result:

- application submits
- success page shows
- applicant appears in HR dashboard
- confirmation/screening email queues

### 5. Commit recovery checkpoint

After the demo works again, commit the recovery as:

```text
Restore stable demo intake after tenant RLS rollback
```
