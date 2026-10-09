-- «تعمیرات خونه»: everything in the house that needs fixing, the parts to buy
-- for the jobs I do myself, and the periodic upkeep (boiler service, water
-- filter…) that comes round on its own. Urgent repairs and upkeep that's due
-- go into the 08:00 push; any of them can be sent to امروز as a task.
--
-- Post-auth recipe (see auth.sql): owner-only policy to `authenticated`,
-- no anon access, service_role for the edge functions, realtime on.

create table if not exists public.home_repairs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  room        text not null default '',
  urgency     text not null default 'soon' check (urgency in ('urgent', 'soon', 'whenever')),
  who         text not null default 'self' check (who in ('self', 'pro')),
  trade       text not null default '',          -- لوله‌کش، برق‌کار… when who = 'pro'
  status      text not null default 'open' check (status in ('open', 'waiting', 'done')),
  est_cost    bigint check (est_cost >= 0),       -- تومان
  actual_cost bigint check (actual_cost >= 0),
  note        text not null default '',
  task_id     uuid references public.tasks(id) on delete set null,  -- sent to امروز
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);
create index if not exists home_repairs_user_id_idx on public.home_repairs (user_id);
create index if not exists home_repairs_task_id_idx on public.home_repairs (task_id);

-- لیست خرید قطعه: what to buy for a repair
create table if not exists public.home_repair_parts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  repair_id  uuid not null references public.home_repairs(id) on delete cascade,
  name       text not null,
  bought     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists home_repair_parts_user_id_idx on public.home_repair_parts (user_id);
create index if not exists home_repair_parts_repair_id_idx on public.home_repair_parts (repair_id);

-- نگهداری دوره‌ای: done → last_done = today, next_due = today + every_months
create table if not exists public.home_maintenance (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null,
  room         text not null default '',
  every_months smallint not null default 12 check (every_months between 1 and 60),
  next_due     date not null,
  last_done    date,
  who          text not null default 'self' check (who in ('self', 'pro')),
  trade        text not null default '',
  note         text not null default '',
  task_id      uuid references public.tasks(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists home_maintenance_user_id_idx on public.home_maintenance (user_id);
create index if not exists home_maintenance_task_id_idx on public.home_maintenance (task_id);

alter table public.home_repairs enable row level security;
alter table public.home_repair_parts enable row level security;
alter table public.home_maintenance enable row level security;

drop policy if exists "owner only" on public.home_repairs;
create policy "owner only" on public.home_repairs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.home_repair_parts;
create policy "owner only" on public.home_repair_parts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner only" on public.home_maintenance;
create policy "owner only" on public.home_maintenance for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.home_repairs, public.home_repair_parts, public.home_maintenance from anon;
grant select, insert, update, delete on public.home_repairs, public.home_repair_parts, public.home_maintenance to authenticated;
grant select, insert, update, delete on public.home_repairs, public.home_repair_parts, public.home_maintenance to service_role;

alter publication supabase_realtime add table public.home_repairs;
alter publication supabase_realtime add table public.home_repair_parts;
alter publication supabase_realtime add table public.home_maintenance;

-- backups: all three join private.backup_tables() (see backups.sql)
