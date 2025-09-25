-- Update the function to use the existing constraint explicitly
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
  select r.weekdays, coalesce(r.end_date, p_to)
    into v_weekdays, v_end
  from public.subtask_recurrences r
  where r.parent_subtask_id = p_parent;

  if v_weekdays is null then
    raise exception 'No recurrence settings for this subtask';
  end if;

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
      insert into public.subtasks(
        task_id, title, description, priority,
        due_date, created_at, recurrence_parent_id
      ) values (
        v_task, v_title, v_desc, v_priority,
        d, now(), p_parent
      )
      on conflict on constraint uniq_occurrence_parent_due do nothing
      returning id into v_new;

      if v_new is not null then
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