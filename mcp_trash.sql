-- مدار MCP trash: what an AI deleted through supabase/functions/madar-mcp,
-- kept 30 days so restore_deleted can bring it back. Applied 2026-11-17 as
-- migration mcp_trash. Owner-only like every other table; no anon access.
create table if not exists public.mcp_trash (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section text not null,
  label text,
  data jsonb not null,
  client text,
  deleted_at timestamptz not null default now(),
  restored_at timestamptz
);
create index if not exists mcp_trash_user_idx on public.mcp_trash (user_id, deleted_at desc);
alter table public.mcp_trash enable row level security;
create policy "owner mcp_trash" on public.mcp_trash for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.mcp_trash to authenticated;
grant select, insert, update, delete on public.mcp_trash to service_role;
revoke all on public.mcp_trash from anon;
