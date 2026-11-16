-- ============================================================
--  مدار MCP — change history («دفترچهٔ تغییرات»), applied 2026-11-17 as
--  migration mcp_history (replaces mcp_trash, which only covered deletes).
--
--  Every write an AI makes through supabase/functions/madar-mcp is one row:
--  entries = [{t: table, k: {primary key}, b: row before, or null if the call
--  created it}] for every row it touched, side effects included (subtasks,
--  tag links, linked repairs/upkeep, postponement log, a deleted task's
--  children). Undoing a row puts every b back (upsert) and removes rows whose
--  b is null; the undo is itself a row (action 'undo', undo_of), so it can be
--  undone too. Kept 30 days. Undo from the AI (undo_changes) or from
--  oauth-consent.html (connected-AIs page), which calls the same function.
-- ============================================================
create table if not exists public.mcp_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null check (action in ('create', 'update', 'delete', 'undo')),
  section text not null,
  label text,
  detail text,
  client text,
  entries jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid,
  undo_of uuid
);
create index if not exists mcp_history_user_idx on public.mcp_history (user_id, created_at desc);
alter table public.mcp_history enable row level security;
drop policy if exists "owner mcp_history" on public.mcp_history;
create policy "owner mcp_history" on public.mcp_history for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- AI tokens only through madar-mcp (see mcp_security.sql)
drop policy if exists "ai only via mcp" on public.mcp_history;
create policy "ai only via mcp" on public.mcp_history as restrictive for all to authenticated
  using ((select private.request_ok())) with check ((select private.request_ok()));
revoke all on public.mcp_history from anon;
grant select, insert, update, delete on public.mcp_history to authenticated;
grant select, insert, update, delete on public.mcp_history to service_role;

-- the delete-only trash it replaces (was empty)
drop table if exists public.mcp_trash;
