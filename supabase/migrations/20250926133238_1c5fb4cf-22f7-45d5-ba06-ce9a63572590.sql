-- ================================
-- Produtive — Patch final Recorrência (sem RLS já existente)
-- (constraint + funções + segurança + idempotência)
-- ================================

-- 0) Colunas necessárias em public.subtasks (recorrência)
alter table public.subtasks
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_parent_id uuid null references public.subtasks(id) on delete cascade;

-- 1) Tabela de configuração da recorrência (se não existir)
create table if not exists public.subtask_recurrences (
  parent_subtask_id uuid primary key references public.subtasks(id) on delete cascade,
  weekdays smallint[] not null,            -- ISO: 1=Seg ... 7=Dom
  end_date date null,
  timezone text null default 'America/Fortaleza',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS for subtask_recurrences se ainda não estiver ativo
do $$
begin
  if not exists (
    select 1 from pg_tables 
    where schemaname = 'public' 
    and tablename = 'subtask_recurrences' 
    and rowsecurity = true
  ) then
    alter table public.subtask_recurrences enable row level security;
  end if;
end $$;

-- 2) Deduplicar ocorrências (mantém a primeira) para permitir UNIQUE
with dups as (
  select recurrence_parent_id, due_date,
         array_agg(id order by created_at asc) as ids
  from public.subtasks
  where recurrence_parent_id is not null
    and due_date is not null
  group by 1,2
  having count(*) > 1
)
delete from public.subtasks s
using dups
where s.id = any(dups.ids[2:]);

-- 3) Se existir um ÍNDICE com este nome (e não uma constraint), remover
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i'
      and n.nspname = 'public'
      and c.relname = 'uniq_occurrence_parent_due'
  ) then
    drop index public.uniq_occurrence_parent_due;
  end if;
end $$;

-- 4) Criar a CONSTRAINT UNIQUE (sem WHERE) para suportar ON CONFLICT
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uniq_occurrence_parent_due'
      and conrelid = 'public.subtasks'::regclass
  ) then
    alter table public.subtasks
      add constraint uniq_occurrence_parent_due
      unique (recurrence_parent_id, due_date);
  end if;
end $$;

-- 5) Função: materializar ocorrências semanais (idempotente)
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
  v_weekdays smallint[];
  v_end date;
  v_count integer := 0;
  d date;
  v_new uuid;
begin
  -- pega config da recorrência
  select r.weekdays, coalesce(r.end_date, p_to)
    into v_weekdays, v_end
  from public.subtask_recurrences r
  where r.parent_subtask_id = p_parent;

  if v_weekdays is null then
    raise exception 'No recurrence settings for this subtask';
  end if;

  d := p_from;
  while d <= least(v_end, p_to) loop
    if extract(isodow from d)::int = any(v_weekdays) then
      -- cria ocorrência copiando do "modelo"
      insert into public.subtasks (
        task_id, title, description, priority,
        due_date, created_at, recurrence_parent_id
      )
      select s.task_id, s.title, s.description, s.priority,
             d, now(), p_parent
        from public.subtasks s
       where s.id = p_parent
      on conflict on constraint uniq_occurrence_parent_due do nothing
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

grant execute on function public.materialize_weekly_recurrences(uuid, date, date) to authenticated;

-- 6) Função: definir/atualizar recorrência semanal (valida dias e materializa)
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
  v_days  smallint[];
begin
  -- autoriza: membro aceito da equipe da subtarefa
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

  -- normaliza/valida dias (1..7)
  if p_weekdays is null or array_length(p_weekdays,1) is null then
    raise exception 'weekdays required';
  end if;

  select array_agg(distinct d order by d) into v_days
  from unnest(p_weekdays) as d;

  if exists (select 1 from unnest(v_days) as d where d < 1 or d > 7) then
    raise exception 'invalid weekdays';
  end if;

  -- marca o "modelo" (self-reference)
  update public.subtasks
     set is_recurring = true,
         recurrence_parent_id = id
   where id = p_parent;

  -- upsert configs
  insert into public.subtask_recurrences (parent_subtask_id, weekdays, end_date, timezone)
  values (p_parent, v_days, p_end_date, coalesce(p_timezone, 'America/Fortaleza'))
  on conflict (parent_subtask_id)
  do update set weekdays = excluded.weekdays,
               end_date  = excluded.end_date,
               timezone  = excluded.timezone,
               updated_at = now();

  -- gera próximas 8 semanas
  perform public.materialize_weekly_recurrences(p_parent, current_date, current_date + 56);
end;
$$;

grant execute on function public.set_subtask_weekly_recurrence(uuid, smallint[], date, text) to authenticated;