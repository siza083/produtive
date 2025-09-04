-- Criar função para inserir convites de equipe
CREATE OR REPLACE FUNCTION public.create_team_invite(
  p_team_id uuid,
  p_invited_email text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gerar um UUID temporário para user_id até que o convite seja aceito
  INSERT INTO public.team_members (
    team_id,
    user_id,
    invited_email,
    role,
    status
  ) VALUES (
    p_team_id,
    gen_random_uuid(), -- UUID temporário
    p_invited_email,
    p_role,
    'pending'
  );
END;
$$;