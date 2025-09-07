-- Hotfix: Fix 42501 permission error in trigger by adding SECURITY DEFINER
-- 1) Recriar a função do trigger com SECURITY DEFINER
create or replace function public.trg_sync_subtasks_assignee()
returns trigger
language plpgsql
security definer                  -- << chave mestra
set search_path = public
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

-- 2) Garantir que o dono da função é 'postgres' (bypassa RLS como owner)
alter function public.trg_sync_subtasks_assignee() owner to postgres;

-- 3) (Se o trigger não existir, criar; se existir, manter)
drop trigger if exists sync_subtasks_assignee on public.subtasks;
create trigger sync_subtasks_assignee
after insert or update of assignee_id on public.subtasks
for each row execute function public.trg_sync_subtasks_assignee();