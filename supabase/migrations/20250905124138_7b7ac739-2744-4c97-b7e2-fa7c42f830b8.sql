-- Fix team creation by adding proper RLS policy for team insertion
-- Users should be able to create teams (as they become the owner)

-- Create policy to allow authenticated users to insert teams they own
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

CREATE POLICY "Users can create teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Ensure users can read teams they are members of (if not already exists)
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;

CREATE POLICY "Users can view teams they belong to" 
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