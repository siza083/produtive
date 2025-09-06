-- Criar RPC create_team (idempotente)
-- Cria equipe e adiciona o usuário chamador como OWNER em uma transação
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Team name is required';
  end if;

  insert into public.teams (name, created_by)
  values (btrim(p_name), auth.uid())
  returning id into v_team;

  -- garante visibilidade imediata: criador vira owner/accepted
  insert into public.team_members (team_id, user_id, role, status, joined_at)
  values (v_team, auth.uid(), 'owner', 'accepted', now());

  return v_team;
end;
$$;

grant execute on function public.create_team(text) to authenticated;

-- Política mínima caso ainda exista algum insert direto
create policy if not exists "insert teams (self)"
on public.teams
for insert to authenticated
with check ( auth.uid() is not null );