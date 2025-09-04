-- Create the proper RLS policy for invitations by owner/admin
DROP POLICY IF EXISTS "invite as owner/admin" ON public.team_invitations;

CREATE POLICY "invite as owner/admin" ON public.team_invitations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'accepted'
      AND tm.role IN ('owner','admin')
  )
  AND status = 'pending'
  AND invited_email IS NOT NULL
);