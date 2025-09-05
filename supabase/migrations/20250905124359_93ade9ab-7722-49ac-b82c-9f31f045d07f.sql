-- Clean up duplicate INSERT policies for teams table
-- Remove all existing INSERT policies and create a single clear one

DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "insert team" ON public.teams;

-- Create a single, clear INSERT policy for teams
CREATE POLICY "authenticated_users_can_create_teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also clean up duplicate SELECT policies and keep the better one
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "select teams as member" ON public.teams;

-- Create a single, clear SELECT policy for teams
CREATE POLICY "users_can_view_their_teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND status = 'accepted'
  )
);