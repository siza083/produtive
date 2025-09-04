import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Users, Calendar, BarChart3, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">Produtive</h1>
          </div>
          
          <Button onClick={() => navigate('/auth')}>
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Gerencie suas tarefas com{" "}
            <span className="text-primary">produtividade</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Organize equipes, defina prioridades e acompanhe o progresso das suas atividades em um dashboard minimalista e focado no que realmente importa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Começar Agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              Saber Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Funcionalidades Principais</h2>
          <p className="text-muted-foreground">
            Tudo que você precisa para gerenciar tarefas e aumentar a produtividade da sua equipe
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Trabalho em Equipe</CardTitle>
              <CardDescription>
                Organize sua equipe, atribua responsáveis e acompanhe o progresso de cada membro
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Dashboard Focado</CardTitle>
              <CardDescription>
                Veja apenas o que precisa ser feito hoje e o que está pendente. Sem distrações.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Relatórios Visuais</CardTitle>
              <CardDescription>
                Acompanhe sua produtividade com gráficos simples e informativos da semana
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para ser mais produtivo?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de profissionais que já usam o Produtive para organizar suas tarefas e aumentar a produtividade da equipe.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Criar Conta Gratuita
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Produtive. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}