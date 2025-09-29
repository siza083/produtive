-- Fix: remove 'isoweek' usage causing 22023 and compute Monday using isodow
-- Keep security and timezone America/Fortaleza

-- Semana Atual — pendentes atribuídas a mim
create or replace function public.my_week_pending(p_user uuid default null)
returns setof public.subtasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(auth.uid(), p_user);
  v_mon date;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;
  if auth.uid() is not null and p_user is not null and auth.uid() <> p_user then
    raise exception 'not allowed';
  end if;

  -- Monday (ISO) at America/Fortaleza
  v_mon := ((now() at time zone 'America/Fortaleza')::date)
           - ((extract(isodow from (now() at time zone 'America/Fortaleza'))::int) - 1);

  return query
  select s.*
  from public.subtasks s
  where s.completed_at is null
    and s.due_date between v_mon and v_mon + 6
    and exists (
      select 1 from public.subtask_assignees sa
      where sa.subtask_id = s.id and sa.user_id = v_uid
    )
  order by
    (s.due_date < current_date) desc,
    case s.priority when 'high' then 3 when 'medium' then 2 else 1 end desc,
    s.created_at asc;
end;
$$;
grant execute on function public.my_week_pending(uuid) to authenticated;

-- Próxima Semana — pendentes atribuídas a mim
create or replace function public.my_nextweek_pending(p_user uuid default null)
returns setof public.subtasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(auth.uid(), p_user);
  v_mon date;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;
  if auth.uid() is not null and p_user is not null and auth.uid() <> p_user then
    raise exception 'not allowed';
  end if;

  -- Monday (ISO) at America/Fortaleza
  v_mon := ((now() at time zone 'America/Fortaleza')::date)
           - ((extract(isodow from (now() at time zone 'America/Fortaleza'))::int) - 1);

  return query
  select s.*
  from public.subtasks s
  where s.completed_at is null
    and s.due_date between v_mon + 7 and v_mon + 13
    and exists (
      select 1 from public.subtask_assignees sa
      where sa.subtask_id = s.id and sa.user_id = v_uid
    )
  order by
    s.due_date asc,
    case s.priority when 'high' then 3 when 'medium' then 2 else 1 end desc,
    s.created_at asc;
end;
$$;
grant execute on function public.my_nextweek_pending(uuid) to authenticated;