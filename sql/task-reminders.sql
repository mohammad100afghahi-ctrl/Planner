-- Task-owned reminders; original reminder rows remain available for backup/recovery.
begin;
alter table public.tasks
  add column reminder_at timestamptz,
  add column reminder_kind text not null default 'once' check (reminder_kind in ('once','yearly','deadline','always')),
  add column reminder_lead_days integer not null default 0 check (reminder_lead_days >= 0),
  add column reminder_sent_at timestamptz,
  add column reminder_claimed_at timestamptz,
  add column legacy_reminder_id uuid unique,
  add column annual_renewed boolean not null default false,
  add column annual_parent_id uuid unique;
alter table public.recurring_templates
  add column reminder_time time,
  add column reminder_days_before integer not null default 0 check (reminder_days_before between 0 and 30);
alter table public.reminders add column migrated_task_id uuid;
create index tasks_due_reminder on public.tasks(reminder_at)
  where not done and reminder_at is not null and reminder_sent_at is null;
create unique index tasks_recurring_occurrence on public.tasks(recurring_template_id,date)
  where recurring_template_id is not null;

insert into public.tasks(id,title,notes,done,date,created_at,user_id,reminder_at,reminder_kind,reminder_lead_days,legacy_reminder_id,annual_renewed,reminder_sent_at)
select id,title,note,done,date,created_at,user_id,
  case when date is not null then ((date-lead_days)+time '08:00') at time zone 'Asia/Baghdad' end,
  kind,lead_days,id,done,
  case when date is not null and (((date-lead_days)+time '08:00') at time zone 'Asia/Baghdad') < now() then now() end
from public.reminders;
update public.reminders set migrated_task_id=id;

create function public.reset_task_reminder_delivery() returns trigger
language plpgsql set search_path='' as $$
begin
  new.reminder_kind=coalesce(new.reminder_kind,'once');
  new.reminder_lead_days=coalesce(new.reminder_lead_days,0);
  new.annual_renewed=coalesce(new.annual_renewed,false);
  if tg_op='INSERT' then return new; end if;
  if new.reminder_at is distinct from old.reminder_at then
    new.reminder_sent_at=null; new.reminder_claimed_at=null;
  end if;
  if new.done then new.reminder_claimed_at=null; end if;
  return new;
end $$;
create trigger reset_task_reminder_delivery before insert or update on public.tasks
for each row execute function public.reset_task_reminder_delivery();

create function public.normalize_template_reminder() returns trigger
language plpgsql set search_path='' as $$
begin
  new.reminder_days_before=coalesce(new.reminder_days_before,0);
  return new;
end $$;
create trigger normalize_template_reminder before insert or update on public.recurring_templates
for each row execute function public.normalize_template_reminder();

-- Old backup files and older clients can still contain standalone reminders.
-- Convert those rows as they arrive without overwriting an already migrated task.
create function public.migrate_legacy_task_reminder() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.migrated_task_id is null then
    insert into public.tasks(id,title,notes,done,date,created_at,user_id,reminder_at,reminder_kind,reminder_lead_days,legacy_reminder_id,annual_renewed,reminder_sent_at)
    values(new.id,new.title,new.note,new.done,new.date,new.created_at,new.user_id,
      case when new.date is not null then ((new.date-new.lead_days)+time '08:00') at time zone 'Asia/Baghdad' end,
      new.kind,new.lead_days,new.id,new.done,case when new.date<=current_date then now() end)
    on conflict(id) do nothing;
    new.migrated_task_id=new.id;
  end if;
  return new;
end $$;
create trigger migrate_legacy_task_reminder before insert on public.reminders
for each row execute function public.migrate_legacy_task_reminder();

-- Only the server may claim delivery; row locks prevent overlapping cron runs.
create function public.claim_task_reminders(p_user_id uuid)
returns setof public.tasks language sql set search_path='' as $$
  update public.tasks t set reminder_claimed_at=now()
  where t.id in (
    select id from public.tasks where user_id=p_user_id and not done
      and reminder_at<=now() and reminder_sent_at is null
      and (reminder_claimed_at is null or reminder_claimed_at<now()-interval '5 minutes')
    order by reminder_at limit 50 for update skip locked
  ) returning t.*;
$$;
revoke all on function public.claim_task_reminders(uuid) from public,anon,authenticated;
grant execute on function public.claim_task_reminders(uuid) to service_role;

-- The edge function computes the next Jalali anniversary. This transaction
-- retains the completed occurrence and clones tags/subtasks exactly once.
create function public.renew_annual_task(p_task_id uuid,p_next_date date)
returns uuid language plpgsql set search_path='' as $$
declare t public.tasks; next_id uuid;
begin
  select * into t from public.tasks where id=p_task_id for update;
  if t.id is null or not t.done or t.reminder_kind<>'yearly' or t.annual_renewed then return null; end if;
  if p_next_date<=t.date then raise exception 'next date must be later'; end if;
  insert into public.tasks(title,notes,priority,date,duration_min,user_id,reminder_at,reminder_kind,reminder_lead_days,annual_parent_id)
  values(t.title,t.notes,t.priority,p_next_date,t.duration_min,t.user_id,
    t.reminder_at+(p_next_date-t.date)*interval '1 day','yearly',t.reminder_lead_days,t.id)
  returning id into next_id;
  insert into public.task_tags(task_id,tag_id,user_id) select next_id,tag_id,t.user_id from public.task_tags where task_id=t.id;
  insert into public.subtasks(task_id,title,done,position,user_id) select next_id,title,false,position,t.user_id from public.subtasks where task_id=t.id;
  update public.tasks set annual_renewed=true where id=t.id;
  return next_id;
end $$;
revoke all on function public.renew_annual_task(uuid,date) from public,anon,authenticated;
grant execute on function public.renew_annual_task(uuid,date) to service_role;

create function public.create_reminded_recurring_task(p_template_id uuid,p_day date,p_at timestamptz)
returns uuid language plpgsql set search_path='' as $$
declare t public.recurring_templates; next_id uuid;
begin
  select * into t from public.recurring_templates where id=p_template_id and active for update;
  if t.id is null or t.reminder_time is null then return null; end if;
  insert into public.tasks(title,notes,priority,date,duration_min,user_id,reminder_at,recurring_template_id)
  values(t.title,t.notes,t.priority,p_day,t.duration_min,t.user_id,p_at,t.id)
  on conflict(recurring_template_id,date) where recurring_template_id is not null do nothing
  returning id into next_id;
  if next_id is not null then
    insert into public.task_tags(task_id,tag_id,user_id) select next_id,tag_id,t.user_id from public.recurring_template_tags where template_id=t.id;
  end if;
  return next_id;
end $$;
revoke all on function public.create_reminded_recurring_task(uuid,date,timestamptz) from public,anon,authenticated;
grant execute on function public.create_reminded_recurring_task(uuid,date,timestamptz) to service_role;
commit;
