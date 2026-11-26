-- ============================================================
--  مدار — lock every table to its signed-in owner
--
--  Before this, every table had `for all using (true)` and a grant to `anon`,
--  so anyone holding the public anon key (it ships inside index.html) could
--  read, edit or delete everything. After this, only a signed-in user sees
--  and writes their own rows.
--
--  Two stages, because stage 2 needs the owner's account to exist:
--    1. add user_id (default auth.uid()) — safe to run any time, nothing breaks
--    2. create the account in Dashboard → Authentication → Users → Add user
--       (Auto Confirm on), turn off sign-ups, then run stage 2: it hands every
--       existing row to that account and swaps the open policies for owner-only.
-- ============================================================

-- ---------- stage 1 ----------
do $$
declare t text;
begin
  foreach t in array array['ai_reports','idea_images','idea_tags','ideas','prompts','purchases',
    'recurring_template_tags','recurring_templates','reminders','subscriptions','subtasks',
    'tag_goals','tags','task_date_changes','task_tags','tasks']
  loop
    -- the client never sends user_id; the default fills it from the JWT
    execute format('alter table public.%I add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
  end loop;
end $$;

-- ---------- stage 2 (after the account exists) ----------
do $$
declare
  t text;
  owner uuid := (select id from auth.users order by created_at limit 1);
begin
  if owner is null then
    raise exception 'no auth user yet — create the account first';
  end if;
  foreach t in array array['ai_reports','idea_images','idea_tags','ideas','prompts','purchases',
    'recurring_template_tags','recurring_templates','reminders','subscriptions','subtasks',
    'tag_goals','tags','task_date_changes','task_tags','tasks']
  loop
    execute format('update public.%I set user_id = %L where user_id is null', t, owner);
    execute format('alter table public.%I alter column user_id set not null', t);

    -- drop the old allow-all policy, whatever it was named
    execute (select coalesce(string_agg(format('drop policy %I on public.%I;', polname, t), ' '), '')
             from pg_policy where polrelid = format('public.%I', t)::regclass);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------- scheduled AI report ----------
-- The cron job used to call generate-ai-report with the anon key, which is also
-- what any stranger has. It now sends a secret only the database knows; the
-- function checks it through check_cron_secret(), callable by service_role only.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.cron_secrets (name text primary key, value text not null);
insert into private.cron_secrets (name, value)
  values ('ai_report', encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (name) do nothing;

create or replace function public.check_cron_secret(s text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from private.cron_secrets where name = 'ai_report' and value = s);
$$;
revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

select cron.unschedule('daily-ai-report-check');
select cron.schedule('daily-ai-report-check', '0 6 * * *', $cron$
  select net.http_post(
    url := 'https://byqowlvyupcusjjyxwaf.supabase.co/functions/v1/generate-ai-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- verify_jwt still wants a well-formed JWT; the anon key is one, and grants nothing on its own
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cW93bHZ5dXBjdXNqanl4d2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzAwMDUsImV4cCI6MjEwMzQwNjAwNX0.T2miyC7NU5u0bkyxA4JKtXML9RSiqeTzk-OAqvx59QM',
      'x-cron-secret', (select value from private.cron_secrets where name = 'ai_report')
    ),
    body := '{}'::jsonb
  );
$cron$);

-- 2026-09-23: edge functions run as service_role, which had no DML on any
-- public table (every report failed with 42501). Applied:
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
