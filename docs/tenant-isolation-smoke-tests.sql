-- Tenant isolation smoke tests.
-- Run after:
-- 1. Deploying applicant Edge Functions.
-- 2. Running supabase/migrations/202607200001_client_tenant_security.sql.
-- 3. Running docs/supabase-create-demo-hr-membership.sql.

select
  'helpers_exist' as test_name,
  exists (
    select 1
    from pg_proc
    where proname = 'current_user_is_platform_admin'
  ) as passed;

select
  'demo_membership_exists' as test_name,
  exists (
    select 1
    from public.client_user_memberships memberships
    join auth.users users on users.id = memberships.user_id
    where lower(users.email) = lower('elvisntumngia@gmail.com')
      and memberships.status = 'active'
  ) as passed;

select
  'no_public_applicant_insert_policy' as test_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'applicants'
      and cmd = 'INSERT'
      and policyname ilike '%public%'
  ) as passed;

select
  'public_storage_insert_removed' as test_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'INSERT'
      and policyname ilike 'Public can upload%'
  ) as passed;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'applicants',
    'applicant_documents',
    'screening_answers',
    'candidate_scores',
    'automation_jobs',
    'notification_queue',
    'objects'
  )
order by schemaname, tablename, policyname;
