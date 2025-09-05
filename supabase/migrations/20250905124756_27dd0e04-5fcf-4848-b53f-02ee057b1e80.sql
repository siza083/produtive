-- Temporary fix: Create a more permissive policy to test team creation
-- We'll be more specific once we confirm the basic functionality works

-- Drop the current INSERT policy
DROP POLICY IF EXISTS "authenticated_users_can_create_teams" ON public.teams;

-- Create a temporary more permissive policy for authenticated users
CREATE POLICY "temp_allow_team_creation" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also add some debugging
CREATE OR REPLACE FUNCTION public.debug_team_creation()
RETURNS TABLE(current_uid uuid, is_authenticated boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() as current_uid,
    (auth.uid() IS NOT NULL) as is_authenticated;
$$;