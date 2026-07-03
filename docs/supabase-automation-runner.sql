-- ViankaX scheduled automation runner
-- Run this in the Supabase SQL Editor after deploying process-automation-jobs.
--
-- Replace YOUR_SUPABASE_ANON_KEY with the project's anon public key.
-- The Edge Function uses its server-side SUPABASE_SERVICE_ROLE_KEY internally,
-- so do not put the service role key in this SQL.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('viankax-process-automation-jobs')
where exists (
  select 1
  from cron.job
  where jobname = 'viankax-process-automation-jobs'
);

select cron.schedule(
  'viankax-process-automation-jobs',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://ayoqzgsimmlblwuqdccs.supabase.co/functions/v1/process-automation-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := jsonb_build_object(
        'mode', 'scheduled-runner',
        'maxJobs', 10
      )
    );
  $$
);

-- Check that the schedule exists:
select jobid, jobname, schedule, active
from cron.job
where jobname = 'viankax-process-automation-jobs';
