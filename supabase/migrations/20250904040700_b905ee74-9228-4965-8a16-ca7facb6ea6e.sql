-- Create a separate table for pending invitations instead of using team_members
-- This avoids the primary key constraint issue

-- Create invitations table for pending invites
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL,
  invited_email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  UNIQUE(team_id, invited_email)
);

-- Enable RLS on invitations table
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "view team invitations as admin" 
ON public.team_invitations 
FOR SELECT 
USING (check_team_admin(team_id, auth.uid()));

CREATE POLICY "insert team invitations as admin" 
ON public.team_invitations 
FOR INSERT 
WITH CHECK (check_team_admin(team_id, auth.uid()));

CREATE POLICY "delete team invitations as admin" 
ON public.team_invitations 
FOR DELETE 
USING (check_team_admin(team_id, auth.uid()));

-- Update the create_team_invite function to use the new table
CREATE OR REPLACE FUNCTION public.create_team_invite(p_team_id uuid, p_invited_email text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is already a team member
  IF EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = p_team_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = team_members.user_id 
      AND profiles.user_id IN (
        SELECT user_id FROM auth.users WHERE email = p_invited_email
      )
    )
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
$function$;

-- Create function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record record;
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Get invitation details
  SELECT * INTO invite_record
  FROM public.team_invitations
  WHERE id = p_invitation_id
  AND invited_email = user_email
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Add user to team
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
  );
  
  -- Remove the invitation
  DELETE FROM public.team_invitations WHERE id = p_invitation_id;
END;
$function$;