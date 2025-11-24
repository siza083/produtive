import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Calendar, Edit, UserPlus, Clock, CalendarIcon } from 'lucide-react';
import { useDashboardData, useToggleSubtaskStatus, useUpdateSubtask, useTeamMembers, type Subtask } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';

export function TodayAndOverdueList() {
  const { data: dashboardData, isLoading } = useDashboardData();
  const toggleStatus = useToggleSubtaskStatus();
  const updateSubtask = useUpdateSubtask();
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, boolean>>({});
  
  // Modal states
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editAssignee, setEditAssignee] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Get team members for the task being edited
  const { data: teamMembers } = useTeamMembers(editingSubtask?.task?.team_id);

  const handleToggleStatus = async (subtask: Subtask) => {
    const newStatus = subtask.status === 'done' ? 'open' : 'done';
    
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

  const handleEditSubtask = (subtask: Subtask) => {
    setEditingSubtask(subtask);
    setEditTitle(subtask.title);
    setEditDescription(subtask.description || '');
    setEditDueDate(subtask.due_date ? new Date(subtask.due_date + 'T00:00:00') : undefined);
    setEditAssignee(subtask.assignee_id || '');
    setEditPriority(subtask.priority || 'medium');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubtask) return;

    const formattedDueDate = editDueDate ? 
      `${editDueDate.getFullYear()}-${String(editDueDate.getMonth() + 1).padStart(2, '0')}-${String(editDueDate.getDate()).padStart(2, '0')}` : undefined;

    try {
      await updateSubtask.mutateAsync({
        id: editingSubtask.id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        due_date: formattedDueDate,
        assignee_id: editAssignee || undefined,
        priority: editPriority
      });
      
      toast({
        title: "Atividade atualizada",
        description: "As alterações foram salvas com sucesso."
      });
      
      setIsEditModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a atividade.",
        variant: "destructive"
      });
    }
  };

  const handleQuickAssigneeChange = async (subtask: Subtask, newAssigneeId: string) => {
    try {
      await updateSubtask.mutateAsync({
        id: subtask.id,
        assignee_id: newAssigneeId || undefined
      });
      
      toast({
        title: "Responsável atualizado",
        description: "A atividade foi reatribuída com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o responsável.",
        variant: "destructive"
      });
    }
  };

  const handleQuickDateChange = async (subtask: Subtask, newDate: Date) => {
    const formattedDate = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    
    try {
      await updateSubtask.mutateAsync({
        id: subtask.id,
        due_date: formattedDate
      });
      
      toast({
        title: "Data atualizada",
        description: "A data de vencimento foi alterada com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a data.",
        variant: "destructive"
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
            {/* Priority Badge */}
            <Badge 
              variant="outline" 
              className={`text-xs ${
                (task.priority || 'medium') === 'high' 
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300' 
                  : (task.priority || 'medium') === 'medium'
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {(task.priority || 'medium') === 'high' ? 'Alta' : 
               (task.priority || 'medium') === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
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
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditSubtask(task)}
            title="Editar atividade"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                title="Alterar responsável"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Alterar responsável</h4>
                <Select 
                  value={task.assignee_id || "none"} 
                  onValueChange={(value) => handleQuickAssigneeChange(task, value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {user && (
                      <SelectItem value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {user.email?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>Eu mesmo</span>
                        </div>
                      </SelectItem>
                    )}
                    {/* Team members will be loaded when needed */}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                title="Alterar data"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={task.due_date ? new Date(task.due_date + 'T00:00:00') : undefined}
                onSelect={(date) => date && handleQuickDateChange(task, date)}
                locale={ptBR}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
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
      
      {/* Edit Subtask Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título da atividade"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={editPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setEditPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start w-full">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {editDueDate ? 
                        format(editDueDate, 'dd/MM/yyyy', { locale: ptBR }) : 
                        'Selecionar data'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={editDueDate}
                      onSelect={setEditDueDate}
                      locale={ptBR}
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={editAssignee || "none"} onValueChange={(value) => setEditAssignee(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {user && (
                      <SelectItem value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {user.email?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>Eu mesmo</span>
                        </div>
                      </SelectItem>
                    )}
                    {teamMembers?.filter(member => member.user_id !== user?.id).map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={updateSubtask.isPending}
                className="flex-1"
              >
                {updateSubtask.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}