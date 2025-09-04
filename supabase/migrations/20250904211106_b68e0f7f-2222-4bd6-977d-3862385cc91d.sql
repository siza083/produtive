-- Criar política RLS para permitir que owner/admin criem convites
CREATE POLICY "invite as owner/admin" ON public.team_invitations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'accepted'
      AND tm.role IN ('owner', 'admin')
  )
);