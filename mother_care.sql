-- «مادر» page: how to treat Mom, who has MS. Months after an attack she looks
-- well and it's easy to forget she's still ill — so the page lists the
-- considerations, and on the chosen weekdays one of them comes to me (a card
-- on امروز and a line in the 08:00 push) instead of waiting to be opened.
--
-- Post-auth recipe (see auth.sql): owner-only policy to `authenticated`,
-- no anon access, service_role for the edge functions, realtime on.

-- one row per account: the «چرا یادم باشه» text and the reminder settings
create table if not exists public.mother_care (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  why           text not null default '',
  remind_days   smallint[] not null default '{6,1,3}',  -- JS getDay(): 0 = یکشنبه … 6 = شنبه
  show_on_today boolean not null default true,
  push          boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table if not exists public.mother_care_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null default 'do' check (kind in ('do', 'dont')),
  category   text not null default '',
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists mother_care_items_user_id_idx on public.mother_care_items (user_id);

alter table public.mother_care enable row level security;
alter table public.mother_care_items enable row level security;

drop policy if exists "owner only" on public.mother_care;
create policy "owner only" on public.mother_care for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.mother_care_items;
create policy "owner only" on public.mother_care_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.mother_care, public.mother_care_items from anon;
grant select, insert, update, delete on public.mother_care, public.mother_care_items to authenticated;
grant select, insert, update, delete on public.mother_care, public.mother_care_items to service_role;

alter publication supabase_realtime add table public.mother_care;
alter publication supabase_realtime add table public.mother_care_items;

-- backups: both tables join private.backup_tables() (see backups.sql)
