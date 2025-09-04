-- Fix the debug function with proper search path
DROP FUNCTION IF EXISTS public.debug_auth_uid();

CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- Try a simpler approach - just check if user is authenticated
DROP POLICY IF EXISTS "insert team" ON public.teams;

CREATE POLICY "insert team" ON public.teams
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);