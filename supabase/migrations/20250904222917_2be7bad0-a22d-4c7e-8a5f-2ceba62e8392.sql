-- Add status column to team_invitations if not exists
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Update existing rows to have pending status
UPDATE public.team_invitations 
SET status = 'pending' 
WHERE status IS NULL;

-- Create unique index for pending invitations
DROP INDEX IF EXISTS team_invitations_pending_unique;
CREATE UNIQUE INDEX team_invitations_pending_unique
ON public.team_invitations (team_id, invited_email)
WHERE status = 'pending';