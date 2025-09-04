-- Add invite_token column if not exists
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS invite_token uuid UNIQUE DEFAULT gen_random_uuid();

-- Create unique index for pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_pending_unique
ON public.team_invitations (team_id, invited_email)
WHERE status = 'pending';

-- Create policy for invite as owner/admin
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