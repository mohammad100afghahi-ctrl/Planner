-- ============================================================
--  مدار — security hardening around the MCP (2026-11-17)
--  Applied as migration mcp_security_hardening.
--
--  An AI connected through OAuth gets a normal Supabase access token for the
--  user (its JWT carries a client_id claim; the app's own tokens never do).
--  Without this file that token could talk to the REST API directly and skip
--  everything madar-mcp adds (30-day trash, side effects), or call the backup
--  restore RPCs. After it:
--    * AI tokens reach the MCP-exposed tables only through madar-mcp, which
--      sends a secret header (x-madar-mcp) the AI provider never sees;
--    * AI tokens never reach backups, push_subscriptions, ai_health, the old
--      reminders table or the hooshavar prefs/sessions tables, nor the backup
--      RPCs, even through madar-mcp;
--    * the app's own tokens (no client_id) behave exactly as before.
-- ============================================================

-- leftover default privileges: PostgREST can't use them, but no reason to keep them
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- the shared secret between madar-mcp and the policies
create table if not exists private.mcp_gate (
  id int primary key default 1 check (id = 1),
  secret text not null
);
insert into private.mcp_gate (id, secret)
  values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (id) do nothing;
revoke all on private.mcp_gate from public, anon, authenticated;

-- true for the app's own tokens; for an AI token only when the request came through madar-mcp
create or replace function private.request_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'client_id', '') = ''
      or coalesce(current_setting('request.headers', true)::json ->> 'x-madar-mcp', '')
         = (select secret from private.mcp_gate where id = 1)
$$;
-- true only for the app's own tokens
create or replace function private.not_ai() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'client_id', '') = ''
$$;
grant usage on schema private to authenticated;
revoke all on function private.request_ok() from public, anon;
revoke all on function private.not_ai() from public, anon;
grant execute on function private.request_ok() to authenticated;
grant execute on function private.not_ai() to authenticated;

-- madar-mcp fetches the secret with the service role
create or replace function public.mcp_gate_secret() returns text
language sql stable security definer set search_path = '' as $$
  select secret from private.mcp_gate where id = 1
$$;
revoke all on function public.mcp_gate_secret() from public, anon, authenticated;
grant execute on function public.mcp_gate_secret() to service_role;

-- restrictive policies: ANDed with the existing owner-only ones
do $$
declare t text;
begin
  foreach t in array array['tasks','subtasks','tags','task_tags','tag_goals','recurring_templates','recurring_template_tags',
    'ideas','idea_tags','idea_images','prompts','purchases','subscriptions','wins','mother_care','mother_care_items',
    'home_repairs','home_repair_parts','home_maintenance','english_homework','english_chunks','english_settings',
    'english_practice','hooshavar_morning','hooshavar_english_logs','ai_reports','task_date_changes','mcp_history']
  loop
    execute format('drop policy if exists "ai only via mcp" on public.%I', t);
    execute format('create policy "ai only via mcp" on public.%I as restrictive for all to authenticated
      using ((select private.request_ok())) with check ((select private.request_ok()))', t);
  end loop;
  foreach t in array array['backups','push_subscriptions','ai_health','reminders','hooshavar_english_prefs','hooshavar_english_sessions']
  loop
    execute format('drop policy if exists "no ai" on public.%I', t);
    execute format('create policy "no ai" on public.%I as restrictive for all to authenticated
      using ((select private.not_ai())) with check ((select private.not_ai()))', t);
  end loop;
end $$;

-- the backup RPCs run as their owner (RLS doesn't apply), so they check for themselves
create or replace function public.backup_now()
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  uid uuid := auth.uid();
  r public.backups;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not private.not_ai() then raise exception 'not allowed for connected apps'; end if;
  r := private.store_backup(uid, 'download');
  return r.data;
end $function$;

create or replace function public.restore_backup(p_data jsonb, p_mode text default 'merge'::text)
 returns uuid language plpgsql security definer set search_path to '' as $function$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not private.not_ai() then raise exception 'not allowed for connected apps'; end if;
  return private.restore_payload(auth.uid(), p_data, p_mode);
end $function$;

create or replace function public.restore_backup_id(p_id uuid, p_mode text default 'merge'::text)
 returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  payload jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not private.not_ai() then raise exception 'not allowed for connected apps'; end if;
  select data into payload from public.backups where id = p_id and user_id = auth.uid();
  if payload is null then raise exception 'backup not found' using errcode = '22023'; end if;
  return private.restore_payload(auth.uid(), payload, p_mode);
end $function$;

-- advisor: fixed search_path on the two helper functions
alter function private.backup_tables() set search_path = '';
alter function private.payload_counts(jsonb) set search_path = '';
