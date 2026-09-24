-- public.wins — the «تونستم» page: things I managed to do, big or small,
-- kept as evidence for the days my mind only counts the failures.
--
-- Post-auth recipe (see auth.sql): owner-only policy to `authenticated`,
-- no anon access, service_role for the edge functions, realtime on.

create table if not exists public.wins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  hardship    text,            -- «با اینکه…» — what stood in the way
  why         text,            -- why it mattered / how it felt
  tag_ids     uuid[] not null default '{}',
  happened_on date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists wins_user_id_idx on public.wins (user_id);

alter table public.wins enable row level security;

drop policy if exists "owner only" on public.wins;
create policy "owner only" on public.wins for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.wins from anon;
grant select, insert, update, delete on public.wins to authenticated;
grant select, insert, update, delete on public.wins to service_role;

alter publication supabase_realtime add table public.wins;
