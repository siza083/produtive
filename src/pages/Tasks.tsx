import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeams, useTasks } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus, Settings, Bell, LogOut, FolderOpen, MoreVertical } from 'lucide-react';
import { TaskModal } from '@/components/TaskModal';

export default function Tasks() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: teams } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const { data: tasks } = useTasks(selectedTeamId);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

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
              <Button variant="default">
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Tarefas</h2>
            <p className="text-muted-foreground">
              Gerencie suas tarefas e atividades organizadas por equipe
            </p>
          </div>
          
          <Button onClick={handleCreateTask}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* Team Filter */}
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium">Filtrar por equipe:</label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as equipes</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tasks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks?.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FolderOpen className="h-5 w-5 text-primary mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-tight">
                        {task.title}
                      </CardTitle>
                      {task.team && (
                        <Badge variant="outline" className="mt-2">
                          {task.team.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditTask(task)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{task.openSubtasks || 0}</span>
                    <span className="text-muted-foreground">
                      /{task.totalSubtasks || 0} atividades
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTask(task)}
                  >
                    Gerenciar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {tasks?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</h3>
              <p className="text-muted-foreground text-center mb-6">
                {selectedTeamId ? 
                  'Esta equipe ainda não tem tarefas criadas.' :
                  'Você ainda não criou nenhuma tarefa.'
                }
                <br />
                Comece criando sua primeira tarefa!
              </p>
              <Button onClick={handleCreateTask}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Tarefa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        teams={teams || []}
      />
    </div>
  );
}