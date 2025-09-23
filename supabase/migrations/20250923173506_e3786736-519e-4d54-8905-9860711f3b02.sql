-- A) Subtasks: marcação de recorrência + referência ao "modelo"
alter table public.subtasks
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_parent_id uuid null
    references public.subtasks(id) on delete cascade;

-- B) Tabela com parâmetros da recorrência semanal
create table if not exists public.subtask_recurrences (
  parent_subtask_id uuid primary key
    references public.subtasks(id) on delete cascade,
  weekdays smallint[] not null,         -- ISO 1=Seg ... 7=Dom
  end_date date null,
  timezone text null default 'America/Fortaleza',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on subtask_recurrences
alter table public.subtask_recurrences enable row level security;

-- RLS policy for subtask_recurrences - users can manage recurrences for subtasks in their teams
create policy "manage recurrences in my teams" on public.subtask_recurrences
for all using (
  exists (
    select 1 from public.subtasks s
    join public.tasks t on t.id = s.task_id
    join public.team_members tm on tm.team_id = t.team_id
    where s.id = parent_subtask_id
      and tm.user_id = auth.uid()
      and tm.status = 'accepted'
  )
);

-- C) Evitar duplicatas de ocorrências pela mesma data
create unique index if not exists uniq_occurrence_parent_due
  on public.subtasks (recurrence_parent_id, due_date)
  where recurrence_parent_id is not null;

-- Gera ocorrências semanais entre duas datas (idempotente)
create or replace function public.materialize_weekly_recurrences(
  p_parent uuid,
  p_from date,
  p_to   date
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task uuid;
  v_team uuid;
  v_title text;
  v_desc text;
  v_priority public.subtask_priority;
  v_end date;
  v_weekdays smallint[];
  v_count integer := 0;
  d date;
  v_new uuid;
begin
  -- parâmetros da recorrência
  select r.weekdays, coalesce(r.end_date, p_to)
    into v_weekdays, v_end
  from public.subtask_recurrences r
  where r.parent_subtask_id = p_parent;

  if v_weekdays is null then
    raise exception 'No recurrence settings for this subtask';
  end if;

  -- dados do "modelo" (subtask que define a recorrência)
  select s.task_id, t.team_id, s.title, s.description, s.priority
    into v_task, v_team, v_title, v_desc, v_priority
  from public.subtasks s
  join public.tasks t on t.id = s.task_id
  where s.id = p_parent;

  if v_task is null then
    raise exception 'Parent subtask not found';
  end if;

  d := p_from;
  while d <= least(v_end, p_to) loop
    if extract(isodow from d)::int = any(v_weekdays) then
      -- cria ocorrência (se não existir) copiando campos essenciais
      insert into public.subtasks (
        task_id, title, description, priority,
        due_date, created_at, recurrence_parent_id
      ) values (
        v_task, v_title, v_desc, v_priority,
        d, now(), p_parent
      )
      on conflict (recurrence_parent_id, due_date) do nothing
      returning id into v_new;

      if v_new is not null then
        -- copia responsáveis do modelo
        insert into public.subtask_assignees (subtask_id, user_id, assigned_by)
        select v_new, sa.user_id, auth.uid()
        from public.subtask_assignees sa
        where sa.subtask_id = p_parent
        on conflict do nothing;

        v_count := v_count + 1;
      end if;
    end if;

    d := d + interval '1 day';
  end loop;

  return v_count;
end;
$$;

-- Define/atualiza recorrência semanal e já gera as próximas 8 semanas
create or replace function public.set_subtask_weekly_recurrence(
  p_parent uuid,
  p_weekdays smallint[],
  p_end_date date default null,
  p_timezone text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  -- Autorização mínima: precisa ser membro aceito da equipe da tarefa
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
       and tm.status = 'accepted'
  ) then
    raise exception 'not allowed';
  end if;

  -- valida weekdays (1..7)
  if p_weekdays is null or array_length(p_weekdays,1) is null then
    raise exception 'weekdays required';
  end if;
  if exists (select 1 where exists (
      select unnest(p_weekdays) w where w < 1 or w > 7
    )) then
    raise exception 'invalid weekdays';
  end if;

  -- marcar a subtask como "modelo" de recorrência
  update public.subtasks
     set is_recurring = true,
         recurrence_parent_id = id
   where id = p_parent;

  -- upsert das configs
  insert into public.subtask_recurrences (parent_subtask_id, weekdays, end_date, timezone)
  values (p_parent, p_weekdays, p_end_date, coalesce(p_timezone, 'America/Fortaleza'))
  on conflict (parent_subtask_id)
  do update set weekdays = excluded.weekdays,
                end_date = excluded.end_date,
                timezone = excluded.timezone,
                updated_at = now();

  -- gerar 8 semanas à frente (56 dias)
  perform public.materialize_weekly_recurrences(
    p_parent,
    current_date,
    current_date + 56
  );
end;
$$;

-- (Opcional) Top-up global diário: abastece próximas 8 semanas para todos os modelos
create or replace function public.top_up_all_recurrences(
  p_days_ahead integer default 56
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_ins integer := 0;
begin
  for r in
    select parent_subtask_id from public.subtask_recurrences
  loop
    v_ins := v_ins + coalesce((
      select public.materialize_weekly_recurrences(
        r.parent_subtask_id, current_date, current_date + p_days_ahead
      )
    ),0);
  end loop;
  return v_ins;
end;
$$;