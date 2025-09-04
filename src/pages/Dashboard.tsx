import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeams, useCreateSampleData } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, Settings, Bell, LogOut, Plus, Users } from 'lucide-react';
import { DashboardCards } from '@/components/DashboardCards';
import { WeekBarChart } from '@/components/WeekBarChart';
import { TodayAndOverdueList } from '@/components/TodayAndOverdueList';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const createSampleData = useCreateSampleData();
  const { toast } = useToast();

  const handleCreateSampleData = async () => {
    try {
      await createSampleData.mutateAsync();
      
      toast({
        title: "Dados de exemplo criados!",
        description: "Sua equipe e atividades de exemplo foram criadas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar os dados de exemplo.",
        variant: "destructive"
      });
    }
  };

  const hasTeams = teams && teams.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <CheckSquare className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Produtive</h1>
            </div>
            
            <nav className="flex items-center gap-4">
              <Button variant="default">
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/tasks')}
              >
                Tarefas
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Olá, {user?.user_metadata?.name || user?.email?.split('@')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Aqui está um resumo das suas atividades para hoje
          </p>
        </div>

        {hasTeams ? (
          <>
            {/* Dashboard Content */}
            <div className="space-y-8">
              <DashboardCards />
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <WeekBarChart />
                <div className="space-y-6">
                  <TodayAndOverdueList />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma equipe encontrada</h3>
              <p className="text-muted-foreground text-center mb-6">
                Você ainda não faz parte de nenhuma equipe.<br />
                Comece criando sua primeira equipe ou sendo convidado para uma!
              </p>
              <div className="flex gap-4">
                <Button onClick={() => {}} disabled={createSampleData.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Equipe
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCreateSampleData}
                  disabled={createSampleData.isPending}
                >
                  {createSampleData.isPending ? 'Criando...' : 'Popular com Exemplos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}