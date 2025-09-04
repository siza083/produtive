-- Fix the team invitation system by making user_id nullable for pending invites
-- and removing the foreign key constraint that's blocking pending invitations

-- First, drop the existing foreign key constraint
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- Make user_id nullable to support pending invitations
ALTER TABLE public.team_members ALTER COLUMN user_id DROP NOT NULL;

-- Recreate the function to use NULL for pending invites instead of random UUID
CREATE OR REPLACE FUNCTION public.create_team_invite(p_team_id uuid, p_invited_email text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert with NULL user_id for pending invites
  INSERT INTO public.team_members (
    team_id,
    user_id,
    invited_email,
    role,
    status
  ) VALUES (
    p_team_id,
    NULL, -- NULL until invite is accepted
    p_invited_email,
    p_role,
    'pending'
  );
END;
$function$;

-- Add a trigger to handle invite acceptance that will set the user_id
CREATE OR REPLACE FUNCTION public.handle_invite_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes from pending to accepted, ensure user_id is set
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- The user_id should be set by the application when accepting the invite
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user_id must be set when accepting an invitation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger for invite acceptance
DROP TRIGGER IF EXISTS handle_invite_acceptance_trigger ON public.team_members;
CREATE TRIGGER handle_invite_acceptance_trigger
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invite_acceptance();

-- Update RLS policies to handle NULL user_id for pending invites
DROP POLICY IF EXISTS "view own membership or team members" ON public.team_members;
CREATE POLICY "view own membership or team members" 
ON public.team_members 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  (check_team_membership(team_id, auth.uid())) OR
  (status = 'pending' AND user_id IS NULL)
);

DROP POLICY IF EXISTS "update team membership" ON public.team_members;
CREATE POLICY "update team membership" 
ON public.team_members 
FOR UPDATE 
USING (
  (user_id = auth.uid()) OR 
  (check_team_admin(team_id, auth.uid())) OR
  (status = 'pending' AND user_id IS NULL)
);

DROP POLICY IF EXISTS "insert team membership" ON public.team_members;
CREATE POLICY "insert team membership" 
ON public.team_members 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL) AND (
    (user_id = auth.uid()) OR 
    (EXISTS ( SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.created_by = auth.uid())) OR
    (status = 'pending' AND user_id IS NULL)
  )
);