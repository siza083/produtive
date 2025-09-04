-- 1) Adicionar coluna de token de convite se não existir
ALTER TABLE public.team_invitations 
ADD COLUMN IF NOT EXISTS invite_token uuid UNIQUE DEFAULT gen_random_uuid();

-- 2) Função para aceitar convite usando token
CREATE OR REPLACE FUNCTION public.accept_team_invite_by_token(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record record;
  user_email text;
BEGIN
  -- Obter email do usuário autenticado
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Buscar convite válido
  SELECT * INTO invite_record
  FROM public.team_invitations
  WHERE invite_token = p_token
  AND invited_email = user_email
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Adicionar usuário à equipe
  INSERT INTO public.team_members (
    team_id,
    user_id,
    role,
    status
  ) VALUES (
    invite_record.team_id,
    auth.uid(),
    invite_record.role,
    'accepted'
  )
  ON CONFLICT (team_id, user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    status = 'accepted';
  
  -- Remover o convite
  DELETE FROM public.team_invitations 
  WHERE invite_token = p_token;
  
  -- Retornar team_id
  RETURN invite_record.team_id;
END;
$$;