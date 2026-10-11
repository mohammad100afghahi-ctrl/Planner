-- public.daily_lines — the one AI-written text per day on «امروز».
-- daily-encouragement writes it with the service role the first time the app
-- asks on a given day and returns the same row for every later call, so a
-- refresh (or a second device) never produces a different text. The last two
-- weeks are also fed back into the prompt so quotes don't repeat.
--
-- A regenerable cache, so it is deliberately left out of the backup.
--
-- Post-auth recipe (see auth.sql): owner-only policy to `authenticated`,
-- no anon access, service_role for the edge function.

create table if not exists public.daily_lines (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null,
  text       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_lines enable row level security;

drop policy if exists "owner only" on public.daily_lines;
create policy "owner only" on public.daily_lines for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.daily_lines from anon;
grant select on public.daily_lines to authenticated;
grant select, insert, update, delete on public.daily_lines to service_role;
