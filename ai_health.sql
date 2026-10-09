-- public.ai_health — one row per user: did هوشواره's last Anthropic call work?
-- The edge functions (generate-ai-report, daily-encouragement) write it with the
-- service role: error_* on a failed call, ok_at on a successful one. The app
-- shows a banner while error_at is newer than ok_at and the kind needs the
-- user (credit ran out, key missing/invalid). Transient kinds (rate, overloaded)
-- are recorded but not shown — the daily cron retries on its own.
--
-- error_kind: 'credit' | 'key' | 'rate' | 'overloaded' | 'other'
--
-- Post-auth recipe (see auth.sql): owner-only policy to `authenticated`,
-- no anon access, service_role for the edge functions, realtime on.

create table if not exists public.ai_health (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  error_kind    text,
  error_message text,
  error_at      timestamptz,
  ok_at         timestamptz
);

alter table public.ai_health enable row level security;
create policy "owner ai_health" on public.ai_health for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.ai_health to authenticated;
grant select, insert, update, delete on public.ai_health to service_role;
alter publication supabase_realtime add table public.ai_health;
