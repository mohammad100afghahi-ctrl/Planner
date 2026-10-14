-- Reuse the existing protected push invocation without exporting its credentials.
-- Apply only after deploying send-push with action='tasks' support.
do $$
declare cmd text;
begin
  select command into cmd from cron.job where jobname='english-push' and active;
  if cmd is null or (length(cmd)-length(replace(cmd,'english','')))/7<>1 or cmd not like '%send-push%' then
    raise exception 'Existing push scheduler shape changed';
  end if;
  perform cron.schedule('task-reminders','* * * * *',replace(cmd,'english','tasks'));
end $$;
