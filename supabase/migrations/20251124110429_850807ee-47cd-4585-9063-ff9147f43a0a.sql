-- Atualizar função my_week_pending para filtrar atividades deletadas
CREATE OR REPLACE FUNCTION public.my_week_pending(p_user uuid DEFAULT NULL::uuid)
 RETURNS SETOF subtasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    and s.deleted_at is null  -- Filtrar atividades deletadas
    and exists (
      select 1 from public.subtask_assignees sa
      where sa.subtask_id = s.id and sa.user_id = v_uid
    )
  order by
    (s.due_date < current_date) desc,
    case s.priority when 'high' then 3 when 'medium' then 2 else 1 end desc,
    s.created_at asc;
end;
$function$;

-- Atualizar função my_nextweek_pending para filtrar atividades deletadas
CREATE OR REPLACE FUNCTION public.my_nextweek_pending(p_user uuid DEFAULT NULL::uuid)
 RETURNS SETOF subtasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    and s.deleted_at is null  -- Filtrar atividades deletadas
    and exists (
      select 1 from public.subtask_assignees sa
      where sa.subtask_id = s.id and sa.user_id = v_uid
    )
  order by
    s.due_date asc,
    case s.priority when 'high' then 3 when 'medium' then 2 else 1 end desc,
    s.created_at asc;
end;
$function$;