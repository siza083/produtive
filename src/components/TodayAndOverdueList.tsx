import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Calendar, Edit, UserPlus, Clock } from 'lucide-react';
import { useDashboardData, useToggleSubtaskStatus, type Subtask } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';

export function TodayAndOverdueList() {
  const { data: dashboardData, isLoading } = useDashboardData();
  const toggleStatus = useToggleSubtaskStatus();
  const { toast } = useToast();
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, boolean>>({});

  const handleToggleStatus = async (subtask: Subtask) => {
    const newStatus = subtask.status === 'open' ? 'done' : 'open';
    
    // Optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [subtask.id]: true }));
    
    try {
      await toggleStatus.mutateAsync({ id: subtask.id, status: newStatus });
      toast({
        title: newStatus === 'done' ? "Atividade concluída!" : "Atividade reaberta",
        description: `"${subtask.title}" foi ${newStatus === 'done' ? 'marcada como concluída' : 'reaberta'}.`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a atividade.",
        variant: "destructive"
      });
    } finally {
      setOptimisticUpdates(prev => {
        const updated = { ...prev };
        delete updated[subtask.id];
        return updated;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const listTasks = dashboardData?.listTasks || [];
  const today = dayjs().format('YYYY-MM-DD');
  
  const overdueTasks = listTasks.filter(task => task.due_date! < today);
  const todayTasks = listTasks.filter(task => task.due_date === today);

  if (listTasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Check className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nada para hoje! 🎉</h3>
          <p className="text-muted-foreground text-center">
            Você não tem atividades vencidas nem para hoje.<br />
            Aproveite para planejar suas próximas atividades!
          </p>
        </CardContent>
      </Card>
    );
  }

  const TaskItem = ({ task, isOverdue }: { task: Subtask; isOverdue: boolean }) => {
    const isUpdating = optimisticUpdates[task.id];
    
    return (
      <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => handleToggleStatus(task)}
          disabled={isUpdating}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {task.task?.team?.name}
            </Badge>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground truncate">
              {task.task?.title}
            </span>
          </div>
          
          <h4 className="font-medium truncate">{task.title}</h4>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {isOverdue ? (
                <Clock className="h-3 w-3 text-red-500" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
              <span className={isOverdue ? 'text-red-500' : ''}>
                {isOverdue ? `Venceu ${dayjs(task.due_date + 'T00:00:00').format('DD/MM')}` : 'Hoje'}
              </span>
            </div>
            
            {task.assignee && (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignee.photo_url} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {task.assignee.name}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Atividades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {overdueTasks.length > 0 && (
          <div>
            <h3 className="font-medium text-red-600 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Vencidas ({overdueTasks.length})
            </h3>
            <div className="space-y-3">
              {overdueTasks.map(task => (
                <TaskItem key={task.id} task={task} isOverdue={true} />
              ))}
            </div>
          </div>
        )}

        {todayTasks.length > 0 && (
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Para Hoje ({todayTasks.length})
            </h3>
            <div className="space-y-3">
              {todayTasks.map(task => (
                <TaskItem key={task.id} task={task} isOverdue={false} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}