-- public.subscriptions — recurring paid services tracked on the اشتراک‌ها page.
--
-- The app talks to Supabase with the public `anon` key only, so a table needs
-- all four steps below. Miss the GRANT and every call fails with 42501 while
-- the optimistic UI still shows the row as if it saved — see the persist()
-- write guard in index.html, which surfaces exactly that failure.

create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  cycle              text not null default 'monthly'
                       check (cycle in ('monthly', 'yearly')),
  next_renewal       date,
  active             boolean not null default true,
  notify_days_before integer not null default 3,
  note               text,
  created_at         timestamptz not null default now()
);

-- 1. RLS on.
alter table public.subscriptions enable row level security;

-- 2. Policy: single-user app, so anon may do everything.
drop policy if exists "allow all subscriptions" on public.subscriptions;
create policy "allow all subscriptions" on public.subscriptions
  for all using (true) with check (true);

-- 3. Table grant — the step that is easy to forget and fails silently.
grant select, insert, update, delete on public.subscriptions to anon, authenticated;

-- 4. Realtime, so a change on one device reaches the others.
alter publication supabase_realtime add table public.subscriptions;
