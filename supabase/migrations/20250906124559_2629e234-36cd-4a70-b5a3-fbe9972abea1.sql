-- Criar RPC delete_team (apenas owner pode excluir)
-- Remove a equipe e todos os dados relacionados em cascata
create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar se o usuário é owner da equipe
  if not exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = 'owner'
      and tm.status = 'accepted'
  ) then
    raise exception 'Only team owners can delete teams';
  end if;

  -- Marcar como deletadas todas as subtasks da equipe (soft delete)
  update public.subtasks 
  set deleted_at = now()
  where task_id in (
    select id from public.tasks 
    where team_id = p_team_id and deleted_at is null
  ) and deleted_at is null;

  -- Marcar como deletadas todas as tasks da equipe (soft delete)
  update public.tasks 
  set deleted_at = now()
  where team_id = p_team_id and deleted_at is null;

  -- Remover convites pendentes
  delete from public.team_invitations where team_id = p_team_id;

  -- Remover membros da equipe
  delete from public.team_members where team_id = p_team_id;

  -- Remover a equipe
  delete from public.teams where id = p_team_id;
end;
$$;

grant execute on function public.delete_team(uuid) to authenticated;