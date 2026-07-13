-- ViankaX scheduled automation runner
-- Run this in the Supabase SQL Editor after deploying process-automation-jobs.
--
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
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3F6Z3NpbW1sYmx3dXFkY2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MzQ1MzEsImV4cCI6MjA5ODQxMDUzMX0.Z4x-1z9ho9axplaj9KYe5ddZ3xGxDldUAAfnSTBrF-Y'
      ),
      body := jsonb_build_object(
        'mode', 'scheduled-runner',
        'maxJobs', 1
      )
    );
  $$
);

create or replace function public.viankax_kick_automation_runner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'automation_jobs' then
    if new.job_status = 'queued' and new.scheduled_for <= now() then
      perform net.http_post(
        url := 'https://ayoqzgsimmlblwuqdccs.supabase.co/functions/v1/process-automation-jobs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3F6Z3NpbW1sYmx3dXFkY2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MzQ1MzEsImV4cCI6MjA5ODQxMDUzMX0.Z4x-1z9ho9axplaj9KYe5ddZ3xGxDldUAAfnSTBrF-Y'
        ),
        body := jsonb_build_object(
          'mode', 'automation-job-trigger',
          'maxJobs', 1
        )
      );
    end if;
  end if;

  if tg_table_name = 'notification_queue' then
    if new.notification_status = 'queued' and new.scheduled_for <= now() then
      perform net.http_post(
        url := 'https://ayoqzgsimmlblwuqdccs.supabase.co/functions/v1/process-automation-jobs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3F6Z3NpbW1sYmx3dXFkY2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MzQ1MzEsImV4cCI6MjA5ODQxMDUzMX0.Z4x-1z9ho9axplaj9KYe5ddZ3xGxDldUAAfnSTBrF-Y'
        ),
        body := jsonb_build_object(
          'mode', 'notification-trigger',
          'maxJobs', 1
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists viankax_kick_automation_jobs on automation_jobs;
create trigger viankax_kick_automation_jobs
after insert or update of job_status, scheduled_for on automation_jobs
for each row
execute function public.viankax_kick_automation_runner();

drop trigger if exists viankax_kick_notification_queue on notification_queue;
create trigger viankax_kick_notification_queue
after insert or update of notification_status, scheduled_for on notification_queue
for each row
execute function public.viankax_kick_automation_runner();

-- Check that the schedule exists:
select jobid, jobname, schedule, active
from cron.job
where jobname = 'viankax-process-automation-jobs';

-- Check that the triggers exist:
select trigger_name, event_object_table
from information_schema.triggers
where trigger_name in ('viankax_kick_automation_jobs', 'viankax_kick_notification_queue')
order by event_object_table, trigger_name;
