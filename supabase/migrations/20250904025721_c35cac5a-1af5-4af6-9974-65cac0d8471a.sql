-- Test if auth.uid() is working properly by creating a debug function
CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Temporarily make the teams insert policy more permissive for debugging
DROP POLICY IF EXISTS "insert team" ON public.teams;

CREATE POLICY "insert team" ON public.teams
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  created_by = auth.uid()
);