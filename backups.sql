-- ============================================================
--  مدار — پشتیبان‌گیری و بازیابی
--
--  One table holds every copy: the weekly automatic ones, a copy of each
--  manual download, and the snapshot taken right before any restore (so a
--  restore can itself be undone). Rows with the data live in the same Supabase
--  project, so they guard against mistakes, not against losing the project —
--  that's what the downloaded file is for, and why the morning digest nags
--  when the last download is over 30 days old.
--
--  Everything runs in SQL so a restore is one transaction: it either lands
--  completely or not at all.
-- ============================================================

create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('auto', 'download', 'pre-restore')),
  created_at timestamptz not null default now(),
  counts jsonb not null default '{}'::jsonb,
  data jsonb not null
);
create index if not exists backups_user_created_idx on public.backups (user_id, created_at desc);

alter table public.backups enable row level security;
create policy "owner reads backups" on public.backups for select to authenticated
  using (user_id = (select auth.uid()));
-- no insert/update/delete policy: rows are only written by the functions below
grant select on public.backups to authenticated;
grant select, insert, update, delete on public.backups to service_role;

-- Parents before children: the order inserts must run in (deletes run reversed).
-- ai_health and push_subscriptions are left out on purpose — they're
-- per-device / transient and restoring them would do harm.
create or replace function private.backup_tables()
returns text[] language sql immutable as $$
  select array['tags','recurring_templates','tasks','subtasks','task_tags','task_date_changes',
    'tag_goals','recurring_template_tags','ideas','idea_tags','idea_images','ai_reports',
    'purchases','subscriptions','reminders','prompts','wins',
    'mother_care','mother_care_items'];
$$;

create or replace function private.backup_payload(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  t text;
  rows jsonb;
  tables jsonb := '{}'::jsonb;
begin
  foreach t in array private.backup_tables() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) - ''user_id''), ''[]''::jsonb) from public.%I x where x.user_id = $1', t)
      into rows using uid;
    tables := tables || jsonb_build_object(t, rows);
  end loop;
  return jsonb_build_object('app', 'madar', 'version', 1, 'created_at', now(), 'tables', tables);
end $$;

create or replace function private.payload_counts(p jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(key, jsonb_array_length(value)), '{}'::jsonb)
  from jsonb_each(p->'tables') where jsonb_typeof(value) = 'array';
$$;

-- Keep the newest few of each kind; everything older goes.
create or replace function private.prune_backups(uid uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.backups b
  using (
    select id, row_number() over (partition by kind order by created_at desc) rn, kind
    from public.backups where user_id = uid
  ) r
  where b.id = r.id
    and r.rn > case r.kind when 'auto' then 4 else 3 end;
$$;

create or replace function private.store_backup(uid uuid, p_kind text)
returns public.backups language plpgsql security definer set search_path = '' as $$
declare
  payload jsonb := private.backup_payload(uid);
  r public.backups;
begin
  insert into public.backups (user_id, kind, counts, data)
    values (uid, p_kind, private.payload_counts(payload), payload)
    returning * into r;
  perform private.prune_backups(uid);
  return r;
end $$;

-- «دانلود پشتیبان»: builds the file, keeps a copy, logs when it happened.
create or replace function public.backup_now()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.backups;
begin
  if uid is null then raise exception 'not signed in'; end if;
  r := private.store_backup(uid, 'download');
  return r.data;
end $$;

/* Restore a backup file (or a stored copy).
   mode 'merge'   — upsert every row: deleted things come back, changed things
                    revert, anything created after the backup stays.
   mode 'replace' — wipe the account's rows first, so it ends up exactly as
                    the file.
   Either way the current data is saved as a 'pre-restore' copy first, and its
   id is returned so the app can offer واگرد. */
create or replace function private.restore_payload(uid uuid, p jsonb, p_mode text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  pre public.backups;
  t text;
  tbls text[] := private.backup_tables();
  i int;
  cols text;
  sel text;
  pk text;
  upd text;
begin
  if p is null or p->>'app' is distinct from 'madar' or jsonb_typeof(p->'tables') is distinct from 'object' then
    raise exception 'invalid backup file' using errcode = '22023';
  end if;
  if (p->>'version')::int > 1 then
    raise exception 'backup from a newer version' using errcode = '22023';
  end if;
  if p_mode not in ('merge', 'replace') then
    raise exception 'bad mode' using errcode = '22023';
  end if;

  pre := private.store_backup(uid, 'pre-restore');

  if p_mode = 'replace' then
    for i in reverse array_length(tbls, 1) .. 1 loop
      execute format('delete from public.%I where user_id = $1', tbls[i]) using uid;
    end loop;
  end if;

  foreach t in array tbls loop
    if jsonb_typeof(p->'tables'->t) is distinct from 'array' or jsonb_array_length(p->'tables'->t) = 0 then
      continue;
    end if;
    select string_agg(format('%I', column_name), ', ' order by ordinal_position),
           string_agg(case when column_name = 'user_id' then '$2' else format('r.%I', column_name) end, ', ' order by ordinal_position)
      into cols, sel
      from information_schema.columns where table_schema = 'public' and table_name = t;
    select string_agg(format('%I', kcu.column_name), ', ' order by kcu.ordinal_position)
      into pk
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu using (constraint_schema, constraint_name, table_name)
      where tc.table_schema = 'public' and tc.table_name = t and tc.constraint_type = 'PRIMARY KEY';
    select string_agg(format('%1$I = excluded.%1$I', c.column_name), ', ')
      into upd
      from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = t and c.column_name <> 'user_id'
        and c.column_name not in (
          select kcu.column_name from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu using (constraint_schema, constraint_name, table_name)
          where tc.table_schema = 'public' and tc.table_name = t and tc.constraint_type = 'PRIMARY KEY');
    -- the "where user_id = excluded.user_id" guard means a row id that belongs
    -- to another account is never overwritten
    execute format(
      'insert into public.%1$I (%2$s) select %3$s from jsonb_populate_recordset(null::public.%1$I, $1) r on conflict (%4$s) %5$s',
      t, cols, sel, pk,
      case when upd is null then 'do nothing'
           else format('do update set %s where public.%I.user_id = excluded.user_id', upd, t) end)
      using p->'tables'->t, uid;
  end loop;

  return pre.id;
end $$;

create or replace function public.restore_backup(p_data jsonb, p_mode text default 'merge')
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return private.restore_payload(auth.uid(), p_data, p_mode);
end $$;

create or replace function public.restore_backup_id(p_id uuid, p_mode text default 'merge')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select data into payload from public.backups where id = p_id and user_id = auth.uid();
  if payload is null then raise exception 'backup not found' using errcode = '22023'; end if;
  return private.restore_payload(auth.uid(), payload, p_mode);
end $$;

-- Weekly, for every account (pg_cron below).
create or replace function private.run_auto_backups()
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  for u in select id from auth.users loop
    perform private.store_backup(u, 'auto');
  end loop;
end $$;

revoke execute on function private.backup_tables(), private.backup_payload(uuid), private.payload_counts(jsonb),
  private.prune_backups(uuid), private.store_backup(uuid, text), private.restore_payload(uuid, jsonb, text),
  private.run_auto_backups() from public, anon, authenticated;
revoke execute on function public.backup_now() from public, anon;
revoke execute on function public.restore_backup(jsonb, text) from public, anon;
revoke execute on function public.restore_backup_id(uuid, text) from public, anon;
grant execute on function public.backup_now() to authenticated;
grant execute on function public.restore_backup(jsonb, text) to authenticated;
grant execute on function public.restore_backup_id(uuid, text) to authenticated;

-- Friday 03:00 Asia/Baghdad (Friday 00:00 UTC).
select cron.schedule('weekly-backup', '0 0 * * 5', $cron$ select private.run_auto_backups(); $cron$);

-- the first automatic copy, so there's one from day one
select private.run_auto_backups();
