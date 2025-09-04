import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useTeams, useCreateTeam, useTeamMembers } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InviteModal } from '@/components/InviteModal';
import { TeamCard } from '@/components/TeamCard';
import { CheckSquare, Settings, Bell, LogOut, User, Users, Mail, Globe, Palette, Shield, UserPlus, Crown, UserX, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function SettingsPage() {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: teams } = useTeams();
  const createTeam = useCreateTeam();
  const { toast } = useToast();

  // Profile form states
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  // Team creation states
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Invite modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  
  // Team members states
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setTimezone(profile.timezone || 'America/Sao_Paulo');
      setTheme(profile.theme || 'system');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProfile({
        name: name.trim(),
        timezone,
        theme
      });
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      await createTeam.mutateAsync({ name: newTeamName.trim() });
      toast({
        title: "Equipe criada!",
        description: "A nova equipe foi criada com sucesso."
      });
      setNewTeamName('');
      setIsCreateTeamOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a equipe.",
        variant: "destructive"
      });
    }
  };

  const handleInviteClick = (team: any) => {
    setSelectedTeam(team);
    setIsInviteModalOpen(true);
  };

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
    { value: 'America/New_York', label: 'Nova York (GMT-5)' },
    { value: 'Europe/London', label: 'Londres (GMT+0)' },
    { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
    { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <CheckSquare className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Produtive</h1>
            </div>
            
            <nav className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/tasks')}
              >
                Tarefas
              </Button>
              <Button variant="default">
                Configurações
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Configurações</h2>
          <p className="text-muted-foreground">
            Gerencie suas preferências pessoais e configurações da conta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      O e-mail não pode ser alterado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso horário</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit">
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Teams Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Minhas Equipes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams?.map((team) => {
                    const isExpanded = expandedTeams.has(team.id);
                    return (
                      <TeamCard 
                        key={team.id} 
                        team={team} 
                        isExpanded={isExpanded}
                        onToggleExpansion={() => toggleTeamExpansion(team.id)}
                        onInviteClick={() => handleInviteClick(team)}
                      />
                    );
                  })}

                  {teams?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Você ainda não faz parte de nenhuma equipe.</p>
                    </div>
                  )}

                  <Separator />
                  
                  <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Nova Equipe
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Nova Equipe</DialogTitle>
                        <DialogDescription>
                          Digite o nome da nova equipe. Você será automaticamente definido como proprietário.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="teamName">Nome da Equipe</Label>
                          <Input
                            id="teamName"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Digite o nome da equipe"
                            required
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            disabled={createTeam.isPending || !newTeamName.trim()}
                          >
                            {createTeam.isPending ? 'Criando...' : 'Criar Equipe'}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setIsCreateTeamOpen(false);
                              setNewTeamName('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile?.photo_url} />
                    <AvatarFallback>
                      {(profile?.name || user?.email)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {profile?.name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{timezones.find(tz => tz.value === timezone)?.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span>Tema {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'do Sistema'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Alterar Senha
                </Button>
                <Button variant="outline" size="sm" className="w-full text-destructive" onClick={signOut}>
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Invite Modal */}
      {selectedTeam && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          team={selectedTeam}
        />
      )}
    </div>
  );
}