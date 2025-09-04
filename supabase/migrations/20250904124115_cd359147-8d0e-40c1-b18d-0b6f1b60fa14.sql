-- Corrigir a função create_team_invite para verificar corretamente se o usuário já é membro
CREATE OR REPLACE FUNCTION public.create_team_invite(p_team_id uuid, p_invited_email text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is already a team member by checking if there's a user with this email who is already a member
  IF EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN auth.users au ON tm.user_id = au.id
    WHERE tm.team_id = p_team_id 
    AND au.email = p_invited_email
    AND tm.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'User is already a member of this team';
  END IF;
  
  -- Insert invitation (will replace existing if any due to UNIQUE constraint)
  INSERT INTO public.team_invitations (
    team_id,
    invited_email,
    role,
    invited_by
  ) VALUES (
    p_team_id,
    p_invited_email,
    p_role,
    auth.uid()
  )
  ON CONFLICT (team_id, invited_email) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    created_at = now(),
    expires_at = now() + interval '7 days';
END;
$$;