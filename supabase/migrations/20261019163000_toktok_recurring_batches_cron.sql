-- Materialize daily TokTok batches every five minutes, using Egypt-local date/time in the function.
select cron.unschedule(jobid)
from cron.job
where jobname = 'toktok-recurring-batches-refresh';

select cron.schedule(
  'toktok-recurring-batches-refresh',
  '*/5 * * * *',
  $$select public.ensure_toktok_daily_batches();$$
);
