-- Corrige validação de dias (1..7) usando UNNEST com alias correto.
create or replace function public.set_subtask_weekly_recurrence(
  p_parent    uuid,
  p_weekdays  smallint[],
  p_end_date  date default null,
  p_timezone  text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team  uuid;
  v_days  smallint[];  -- dias normalizados (únicos e ordenados)
begin
  -- 1) Verifica equipe/permite apenas membro aceito
  select t.team_id into v_team
  from public.subtasks s
  join public.tasks t on t.id = s.task_id
  where s.id = p_parent;

  if v_team is null then
    raise exception 'Subtask not found';
  end if;

  if not exists (
    select 1 from public.team_members tm
     where tm.team_id = v_team
       and tm.user_id = auth.uid()
       and tm.status  = 'accepted'
  ) then
    raise exception 'not allowed';
  end if;

  -- 2) Normaliza e valida dias (ISO 1..7). **AQUI estava o erro.**
  if p_weekdays is null or array_length(p_weekdays,1) is null then
    raise exception 'weekdays required';
  end if;

  -- remove duplicados e ordena
  select array_agg(distinct d order by d) into v_days
  from unnest(p_weekdays) as d;

  -- valida faixa 1..7 corretamente
  if exists (select 1 from unnest(v_days) as d where d < 1 or d > 7) then
    raise exception 'invalid weekdays';
  end if;

  -- 3) Marca a subtask como "modelo" de recorrência (self-reference)
  update public.subtasks
     set is_recurring = true,
         recurrence_parent_id = id
   where id = p_parent;

  -- 4) Upsert das configurações
  insert into public.subtask_recurrences (parent_subtask_id, weekdays, end_date, timezone)
  values (p_parent, v_days, p_end_date, coalesce(p_timezone, 'America/Fortaleza'))
  on conflict (parent_subtask_id)
  do update set weekdays = excluded.weekdays,
               end_date  = excluded.end_date,
               timezone  = excluded.timezone,
               updated_at = now();

  -- 5) Gera próximas 8 semanas (idempotente)
  perform public.materialize_weekly_recurrences(
    p_parent,
    current_date,
    current_date + 56
  );
end;
$$;

-- (garante que usuários autenticados podem chamar)
grant execute on function public.set_subtask_weekly_recurrence(uuid, smallint[], date, text) to authenticated;