-- Remove existing trigger if exists
drop trigger if exists trg_set_completed_at on public.subtasks;
drop trigger if exists trg_notify_on_assign on public.subtasks;

-- completed_at trigger
create or replace function public.set_completed_at()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'done' and (OLD.status is distinct from 'done') then
    NEW.completed_at := now();
  elsif NEW.status = 'open' and (OLD.status is distinct from 'open') then
    NEW.completed_at := null;
  end if;
  return NEW;
end;$$;

create trigger trg_set_completed_at
before update on public.subtasks
for each row execute function public.set_completed_at();

-- notification on assign trigger
create or replace function public.notify_on_assign()
returns trigger language plpgsql as $$
begin
  if NEW.assignee_id is not null and (OLD.assignee_id is distinct from NEW.assignee_id) then
    insert into public.notifications(user_id, subtask_id, type)
    values (NEW.assignee_id, NEW.id, 'assigned');
  end if;
  return NEW;
end;$$;

create trigger trg_notify_on_assign
after insert or update of assignee_id on public.subtasks
for each row execute function public.notify_on_assign();