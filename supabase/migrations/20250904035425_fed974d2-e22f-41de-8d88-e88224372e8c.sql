-- Tornar user_id opcional para permitir convites pendentes
ALTER TABLE public.team_members 
ALTER COLUMN user_id DROP NOT NULL;

-- Remover constraint única existente se houver
DROP INDEX IF EXISTS team_members_user_id_team_id_key;

-- Criar constraint única condicional para user_id não nulo
CREATE UNIQUE INDEX team_members_user_team_unique 
ON public.team_members (user_id, team_id) 
WHERE user_id IS NOT NULL;

-- Criar constraint única condicional para email convites pendentes
CREATE UNIQUE INDEX team_members_email_team_unique 
ON public.team_members (invited_email, team_id) 
WHERE invited_email IS NOT NULL AND status = 'pending';