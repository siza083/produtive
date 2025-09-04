import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';

export function JoinTeam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  const invitationId = searchParams.get('invitation');
  const email = searchParams.get('email');

  useEffect(() => {
    const loadInvitationDetails = async () => {
      if (!invitationId || !email) {
        setError('Link de convite inválido.');
        return;
      }

      try {
        // Buscar detalhes do convite
        const { data: invitation, error: inviteError } = await supabase
          .from('team_invitations')
          .select(`
            *
          `)
          .eq('team_id', invitationId)
          .eq('invited_email', email)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (inviteError || !invitation) {
          setError('Convite não encontrado, inválido ou expirado.');
          return;
        }

        // Buscar nome da equipe
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', invitationId)
          .single();

        // Buscar nome do usuário que convidou
        const { data: inviter } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', invitation.invited_by)
          .single();

        setTeamName(team?.name || 'Equipe');
        setInviterName(inviter?.name || 'Alguém');
        setRole(invitation.role === 'admin' ? 'Administrador' : 'Membro');
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Erro ao carregar detalhes do convite.');
      }
    };

    loadInvitationDetails();
  }, [invitationId, email]);

  const handleAcceptInvite = async () => {
    if (!user) {
      // Redirecionar para login se não autenticado
      navigate(`/auth?redirect=/join-team?invitation=${invitationId}&email=${encodeURIComponent(email || '')}`);
      return;
    }

    if (user.email !== email) {
      setError('Este convite é para outro endereço de email.');
      return;
    }

    setIsLoading(true);
    try {
      // Buscar o convite específico usando team_id e email
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', invitationId) // invitationId é na verdade o team_id
        .eq('invited_email', email)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        console.error('Invitation lookup error:', inviteError);
        throw new Error('Convite não encontrado ou expirado');
      }

      // Usar a função RPC para aceitar o convite com o ID real da invitation
      const { error: acceptError } = await supabase.rpc('accept_team_invitation', {
        p_invitation_id: invitation.id
      });

      if (acceptError) {
        console.error('Accept invitation error:', acceptError);
        throw acceptError;
      }

      toast({
        title: 'Convite aceito!',
        description: `Você agora faz parte da equipe "${teamName}".`
      });

      // Redirecionar para dashboard após sucesso
      navigate('/dashboard');
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aceitar o convite. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineInvite = () => {
    navigate('/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teamName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Convite para Equipe</CardTitle>
          <CardDescription>
            Você foi convidado para participar de uma equipe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p>
              <strong>{inviterName}</strong> convidou você para participar da equipe{' '}
              <strong>"{teamName}"</strong> como <strong>{role}</strong>.
            </p>
          </div>

          {!user && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Você precisa fazer login para aceitar este convite.
              </p>
            </div>
          )}

          {user && user.email !== email && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive text-center">
                Este convite é para {email}, mas você está logado como {user.email}.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAcceptInvite}
              disabled={isLoading || (user?.email !== email)}
              className="flex-1"
            >
              {isLoading ? 'Aceitando...' : 'Aceitar Convite'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeclineInvite}
              disabled={isLoading}
            >
              Recusar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}