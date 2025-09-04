import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token = searchParams.get("token");

  useEffect(() => {
    const handleInviteAcceptance = async () => {
      if (authLoading) return; // Wait for auth to load
      
      if (!token) {
        setError("Token de convite inválido");
        return;
      }

      if (!user) {
        // User not logged in, redirect to auth with return URL
        const returnUrl = `/accept-invite?token=${token}`;
        navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        return;
      }

      // User is logged in, process the invitation
      setProcessing(true);
      
      try {
        const { data: teamId, error } = await supabase.rpc('accept_team_invite_by_token', {
          p_token: token
        });

        if (error) {
          console.error('Error accepting invite:', error);
          setError(error.message || 'Erro ao aceitar convite');
          return;
        }

        toast({
          title: "Convite aceito!",
          description: "Você foi adicionado à equipe com sucesso.",
        });

        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Error accepting invite:', err);
        setError('Erro inesperado ao aceitar convite');
      } finally {
        setProcessing(false);
      }
    };

    handleInviteAcceptance();
  }, [token, user, authLoading, navigate, toast]);

  if (authLoading || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando convite...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Aguarde enquanto processamos seu convite de equipe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Erro no convite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null; // This should not render as the useEffect handles all cases
};