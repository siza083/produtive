-- Add permissions column to team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Function to add member by email (accepted immediately)
CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_team uuid,
  p_email text,
  p_role text DEFAULT 'member',
  p_permissions jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_user uuid;
  v_is_owner boolean;
BEGIN
  -- Check if caller is owner/admin of the team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team
      AND tm.user_id = auth.uid()
      AND tm.status = 'accepted'
      AND tm.role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Find user by email in auth.users
  SELECT id INTO v_user FROM auth.users WHERE LOWER(email) = LOWER(p_email) LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found. Ask them to sign up first.';
  END IF;

  -- Only owner can grant owner role
  IF p_role = 'owner' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.team_members
      WHERE team_id = p_team AND user_id = auth.uid()
        AND role = 'owner' AND status = 'accepted'
    ) INTO v_is_owner;
    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'Only owner can grant owner role';
    END IF;
  END IF;

  -- Insert or update team member
  INSERT INTO public.team_members(team_id, user_id, role, status, invited_email, joined_at, permissions)
  VALUES (p_team, v_user, COALESCE(p_role,'member'), 'accepted', NULL, now(), COALESCE(p_permissions, '{}'::jsonb))
  ON CONFLICT (team_id, user_id)
  DO UPDATE SET 
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    status = 'accepted',
    invited_email = NULL,
    joined_at = CASE 
      WHEN public.team_members.joined_at IS NULL THEN now() 
      ELSE public.team_members.joined_at 
    END;

  RETURN v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_member_by_email(uuid, text, text, jsonb) TO authenticated;

-- Function to update member access
CREATE OR REPLACE FUNCTION public.update_member_access(
  p_team uuid,
  p_user uuid,
  p_role text DEFAULT NULL,
  p_permissions jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_actor_is_owner boolean;
  v_target_is_owner boolean;
BEGIN
  -- Check if actor is owner
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team AND user_id = auth.uid()
      AND status='accepted' AND role='owner'
  ) INTO v_actor_is_owner;

  -- Check if actor has permission (owner or admin)
  IF NOT v_actor_is_owner AND NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team AND user_id = auth.uid()
      AND status='accepted' AND role='admin'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Check if target is owner
  SELECT (role='owner') INTO v_target_is_owner
  FROM public.team_members WHERE team_id = p_team AND user_id = p_user;

  -- Admin cannot modify owner
  IF v_target_is_owner AND NOT v_actor_is_owner THEN
    RAISE EXCEPTION 'Admin cannot modify owner';
  END IF;

  -- Update member
  UPDATE public.team_members
     SET role = COALESCE(p_role, role),
         permissions = COALESCE(p_permissions, permissions)
   WHERE team_id = p_team AND user_id = p_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_access(uuid, uuid, text, jsonb) TO authenticated;

-- Function to remove member
CREATE OR REPLACE FUNCTION public.remove_member(
  p_team uuid,
  p_user uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_actor_is_owner boolean;
  v_target_is_owner boolean;
BEGIN
  -- Check if actor is owner
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team AND user_id = auth.uid()
      AND status='accepted' AND role='owner'
  ) INTO v_actor_is_owner;

  -- Check if actor has permission (owner or admin)
  IF NOT v_actor_is_owner AND NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team AND user_id = auth.uid()
      AND status='accepted' AND role='admin'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Check if target is owner
  SELECT (role='owner') INTO v_target_is_owner
  FROM public.team_members WHERE team_id = p_team AND user_id = p_user;

  -- Admin cannot remove owner
  IF v_target_is_owner AND NOT v_actor_is_owner THEN
    RAISE EXCEPTION 'Admin cannot remove owner';
  END IF;

  -- Remove member
  DELETE FROM public.team_members
   WHERE team_id = p_team AND user_id = p_user;
END;
$$;