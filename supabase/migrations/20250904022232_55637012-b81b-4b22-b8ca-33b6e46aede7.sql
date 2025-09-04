-- Fix search_path for functions
create or replace function public.set_completed_at()
returns trigger language plpgsql 
security definer set search_path = public
as $$
begin
  if NEW.status = 'done' and (OLD.status is distinct from 'done') then
    NEW.completed_at := now();
  elsif NEW.status = 'open' and (OLD.status is distinct from 'open') then
    NEW.completed_at := null;
  end if;
  return NEW;
end;$$;

create or replace function public.notify_on_assign()
returns trigger language plpgsql 
security definer set search_path = public
as $$
begin
  if NEW.assignee_id is not null and (OLD.assignee_id is distinct from NEW.assignee_id) then
    insert into public.notifications(user_id, subtask_id, type)
    values (NEW.assignee_id, NEW.id, 'assigned');
  end if;
  return NEW;
end;$$;