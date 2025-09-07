-- 0) Garantir coluna de permissões por membro (usada em checagem de "can_assign")
alter table public.team_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- 1) TABELA N:N (subtarefa ↔ usuário) para múltiplos responsáveis
create table if not exists public.subtask_assignees (
  subtask_id  uuid not null references public.subtasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id)      on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid null references auth.users(id),
  primary key (subtask_id, user_id)
);
create index if not exists subtask_assignees_user_idx    on public.subtask_assignees(user_id);
create index if not exists subtask_assignees_subtask_idx on public.subtask_assignees(subtask_id);

-- 2) BACKFILL a partir do modelo antigo (se existir subtasks.assignee_id)
do $$ begin
  if exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='subtasks' and column_name='assignee_id'
  ) then
    insert into public.subtask_assignees (subtask_id, user_id, assigned_at)
    select s.id, s.assignee_id, now()
      from public.subtasks s
     where s.assignee_id is not null
       and not exists (
         select 1 from public.subtask_assignees sa
          where sa.subtask_id = s.id and sa.user_id = s.assignee_id
       );
  end if;
end $$;

-- 3) TRIGGER de compatibilidade (sincroniza quando o legado gravar assignee_id)
create or replace function public.trg_sync_subtasks_assignee()
returns trigger
language plpgsql
as $$
begin
  if new.assignee_id is not null then
    insert into public.subtask_assignees (subtask_id, user_id, assigned_at, assigned_by)
    values (new.id, new.assignee_id, now(), auth.uid())
    on conflict (subtask_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='subtasks' and column_name='assignee_id'
  ) then
    drop trigger if exists sync_subtasks_assignee on public.subtasks;
    create trigger sync_subtasks_assignee
    after insert or update of assignee_id on public.subtasks
    for each row execute function public.trg_sync_subtasks_assignee();
  end if;
end $$;

-- 4) RLS: leitura para membros; escrita via RPC
alter table public.subtask_assignees enable row level security;

drop policy if exists "members can select subtask_assignees" on public.subtask_assignees;
create policy "members can select subtask_assignees"
on public.subtask_assignees for select to authenticated
using (
  exists (
    select 1
      from public.subtasks s
      join public.tasks   t  on t.id = s.task_id
      join public.team_members tm on tm.team_id = t.team_id
     where s.id = subtask_assignees.subtask_id
       and tm.user_id = auth.uid()
       and tm.status = 'accepted'
  )
);

revoke insert, update, delete on public.subtask_assignees from authenticated;
grant  select                 on public.subtask_assignees to   authenticated;

-- 5) RPC: definir conjunto completo de responsáveis de uma subtarefa
create or replace function public.set_subtask_assignees(
  p_subtask uuid,
  p_user_ids uuid[]
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_can_assign boolean;
  v_count integer;
begin
  select t.team_id into v_team
    from public.subtasks s
    join public.tasks t on t.id = s.task_id
   where s.id = p_subtask;

  if v_team is null then
    raise exception 'Subtask not found';
  end if;

  -- Autorização: owner/admin ou permissions.can_assign = true
  select exists(
    select 1 from public.team_members tm
     where tm.team_id = v_team
       and tm.user_id = auth.uid()
       and tm.status = 'accepted'
       and (
         tm.role in ('owner','admin')
         or coalesce((tm.permissions->>'can_assign')::boolean, false) = true
       )
  ) into v_can_assign;

  if not v_can_assign then
    raise exception 'not allowed';
  end if;

  delete from public.subtask_assignees where subtask_id = p_subtask;

  insert into public.subtask_assignees (subtask_id, user_id, assigned_by)
  select p_subtask, tm.user_id, auth.uid()
    from public.team_members tm
   where tm.team_id = v_team
     and tm.status = 'accepted'
     and tm.user_id = any(p_user_ids)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.set_subtask_assignees(uuid, uuid[]) to authenticated;

-- 6) (Opcional) RPCs para adicionar/remover 1 responsável
create or replace function public.add_subtask_assignee(p_subtask uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_team uuid; declare v_can_assign boolean;
begin
  select t.team_id into v_team
    from public.subtasks s join public.tasks t on t.id = s.task_id
   where s.id = p_subtask;
  if v_team is null then raise exception 'Subtask not found'; end if;

  select exists(
    select 1 from public.team_members tm
     where tm.team_id = v_team and tm.user_id = auth.uid()
       and tm.status='accepted'
       and (tm.role in ('owner','admin')
            or coalesce((tm.permissions->>'can_assign')::boolean, false)=true)
  ) into v_can_assign;
  if not v_can_assign then raise exception 'not allowed'; end if;

  insert into public.subtask_assignees (subtask_id, user_id, assigned_by)
  values (p_subtask, p_user, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.remove_subtask_assignee(p_subtask uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_team uuid; declare v_can_assign boolean;
begin
  select t.team_id into v_team
    from public.subtasks s join public.tasks t on t.id = s.task_id
   where s.id = p_subtask;
  if v_team is null then raise exception 'Subtask not found'; end if;

  select exists(
    select 1 from public.team_members tm
     where tm.team_id = v_team and tm.user_id = auth.uid()
       and tm.status='accepted'
       and (tm.role in ('owner','admin')
            or coalesce((tm.permissions->>'can_assign')::boolean, false)=true)
  ) into v_can_assign;
  if not v_can_assign then raise exception 'not allowed'; end if;

  delete from public.subtask_assignees
   where subtask_id = p_subtask and user_id = p_user;
end;
$$;

grant execute on function public.add_subtask_assignee(uuid, uuid)    to authenticated;
grant execute on function public.remove_subtask_assignee(uuid, uuid) to authenticated;