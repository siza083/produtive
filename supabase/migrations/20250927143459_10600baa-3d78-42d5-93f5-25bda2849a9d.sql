-- Semana Atual: pendentes atribuídas a mim, 2ª→domingo (Fortaleza)
create or replace function public.my_week_pending()
returns setof public.subtasks
language sql
security definer
set search_path=public
as $$
with anchor as (
  select date_trunc('isoweek', (now() at time zone 'America/Fortaleza'))::date as mon
)
select s.*
from public.subtasks s
where s.completed_at is null
  and s.due_date between (select mon from anchor) and (select mon from anchor) + 6
  and exists (
    select 1 from public.subtask_assignees sa
     where sa.subtask_id = s.id and sa.user_id = auth.uid()
  )
order by
  (s.due_date < current_date) desc,                                      -- vencidas da semana no topo
  case s.priority when 'high' then 3 when 'medium' then 2 else 1 end desc,
  s.created_at asc;
$$;

grant execute on function public.my_week_pending() to authenticated;

-- Próxima Semana: pendentes atribuídas a mim, 2ª→domingo (Fortaleza)
create or replace function public.my_nextweek_pending()
returns setof public.subtasks
language sql
security definer
set search_path=public
as $$
with anchor as (
  select date_trunc('isoweek', (now() at time zone 'America/Fortaleza'))::date as mon
)
select s.*
from public.subtasks s
where s.completed_at is null
  and s.due_date between (select mon from anchor) + 7 and (select mon from anchor) + 13
  and exists (
    select 1 from public.subtask_assignees sa
     where sa.subtask_id = s.id and sa.user_id = auth.uid()
  )
order by
  s.due_date asc,
  case s.priority when 'high' then 3 when 'medium' then 2 else 1 end desc,
  s.created_at asc;
$$;

grant execute on function public.my_nextweek_pending() to authenticated;