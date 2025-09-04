import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, CalendarIcon, User, Edit, Trash2, CheckSquare, Circle } from 'lucide-react';
import { useCreateTask, useUpdateTask, useDeleteTask, useSubtasks, useCreateSubtask, useUpdateSubtask, useDeleteSubtask, useToggleSubtaskStatus, type Team } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  teams: Team[];
}

export function TaskModal({ isOpen, onClose, task, teams }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  
  // Subtask form states
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  const [subtaskDueDate, setSubtaskDueDate] = useState<Date | undefined>();
  const [subtaskAssignee, setSubtaskAssignee] = useState('');

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: subtasks } = useSubtasks(task?.id);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const toggleSubtaskStatus = useToggleSubtaskStatus();
  const { toast } = useToast();

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setTeamId(task.team_id || '');
    } else {
      setTitle('');
      setDescription('');
      setTeamId('');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !teamId) return;

    try {
      if (isEditing) {
        await updateTask.mutateAsync({
          id: task.id,
          title: title.trim(),
          description: description.trim() || undefined
        });
        toast({
          title: "Tarefa atualizada",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        await createTask.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          team_id: teamId
        });
        toast({
          title: "Tarefa criada",
          description: "A nova tarefa foi criada com sucesso."
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: `Não foi possível ${isEditing ? 'atualizar' : 'criar'} a tarefa.`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    try {
      await deleteTask.mutateAsync(task.id);
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi excluída com sucesso."
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a tarefa.",
        variant: "destructive"
      });
    }
  };

  const handleSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim() || !task) return;

    // Garantir que a data seja tratada como data local (não UTC)
    const formattedDueDate = subtaskDueDate ? 
      `${subtaskDueDate.getFullYear()}-${String(subtaskDueDate.getMonth() + 1).padStart(2, '0')}-${String(subtaskDueDate.getDate()).padStart(2, '0')}` : undefined;
    
    console.log('Salvando subtarefa:', {
      title: subtaskTitle.trim(),
      description: subtaskDescription.trim() || undefined,
      due_date: formattedDueDate,
      assignee_id: subtaskAssignee || undefined,
      isEditing: !!editingSubtask
    });

    try {
      if (editingSubtask) {
        console.log('Atualizando subtarefa ID:', editingSubtask.id);
        await updateSubtask.mutateAsync({
          id: editingSubtask.id,
          task_id: task.id,
          title: subtaskTitle.trim(),
          description: subtaskDescription.trim() || undefined,
          due_date: formattedDueDate,
          assignee_id: subtaskAssignee || undefined
        });
        toast({
          title: "Atividade atualizada",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        await createSubtask.mutateAsync({
          task_id: task.id,
          title: subtaskTitle.trim(),
          description: subtaskDescription.trim() || undefined,
          due_date: formattedDueDate,
          assignee_id: subtaskAssignee || undefined
        });
        toast({
          title: "Atividade criada",
          description: "A nova atividade foi criada com sucesso."
        });
      }
      
      // Reset form
      setSubtaskTitle('');
      setSubtaskDescription('');
      setSubtaskDueDate(undefined);
      setSubtaskAssignee('');
      setIsSubtaskFormOpen(false);
      setEditingSubtask(null);
    } catch (error) {
      console.error('Erro ao salvar subtarefa:', error);
      toast({
        title: "Erro",
        description: `Não foi possível ${editingSubtask ? 'atualizar' : 'criar'} a atividade.`,
        variant: "destructive"
      });
    }
  };

  const handleEditSubtask = (subtask: any) => {
    setEditingSubtask(subtask);
    setSubtaskTitle(subtask.title);
    setSubtaskDescription(subtask.description || '');
    // Garantir que a data seja carregada corretamente (sem problemas de timezone)
    setSubtaskDueDate(subtask.due_date ? new Date(subtask.due_date + 'T00:00:00') : undefined);
    setSubtaskAssignee(subtask.assignee_id || '');
    setIsSubtaskFormOpen(true);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask.mutateAsync(subtaskId);
      toast({
        title: "Atividade excluída",
        description: "A atividade foi excluída com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a atividade.",
        variant: "destructive"
      });
    }
  };

  const handleToggleSubtask = async (subtask: any) => {
    const newStatus = subtask.status === 'open' ? 'done' : 'open';
    try {
      await toggleSubtaskStatus.mutateAsync({ id: subtask.id, status: newStatus });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a atividade.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 
              'Edite os detalhes da tarefa e gerencie suas atividades.' :
              'Crie uma nova tarefa para organizar suas atividades.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os objetivos desta tarefa"
              rows={3}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="team">Equipe *</Label>
              <Select value={teamId} onValueChange={setTeamId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={createTask.isPending || updateTask.isPending}
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
            
            {isEditing && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDeleteTask}
                disabled={deleteTask.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </form>

        {/* Subtasks Section */}
        {isEditing && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Atividades</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSubtaskFormOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Atividade
                </Button>
              </div>

              {/* Subtask Form */}
              {isSubtaskFormOpen && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">
                    {editingSubtask ? 'Editar Atividade' : 'Nova Atividade'}
                  </h4>
                  
                  <form onSubmit={handleSubtaskSubmit} className="space-y-3">
                    <Input
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      placeholder="Título da atividade"
                      required
                    />
                    
                    <Textarea
                      value={subtaskDescription}
                      onChange={(e) => setSubtaskDescription(e.target.value)}
                      placeholder="Descrição (opcional)"
                      rows={2}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {subtaskDueDate ? 
                              format(subtaskDueDate, 'dd/MM/yyyy', { locale: ptBR }) : 
                              'Data de vencimento'
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={subtaskDueDate}
                            onSelect={setSubtaskDueDate}
                            locale={ptBR}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Select value={subtaskAssignee || "none"} onValueChange={(value) => setSubtaskAssignee(value === "none" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem responsável</SelectItem>
                          {/* TODO: Add team members */}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={createSubtask.isPending || updateSubtask.isPending}
                      >
                        {editingSubtask ? 'Salvar' : 'Criar'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsSubtaskFormOpen(false);
                          setEditingSubtask(null);
                          setSubtaskTitle('');
                          setSubtaskDescription('');
                          setSubtaskDueDate(undefined);
                          setSubtaskAssignee('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Subtasks List */}
              <div className="space-y-2">
                {subtasks?.map((subtask) => (
                  <div 
                    key={subtask.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={subtask.status === 'done'}
                      onCheckedChange={() => handleToggleSubtask(subtask)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${subtask.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </span>
                        {subtask.status === 'done' && (
                          <Badge variant="secondary" className="text-xs">
                            Concluída
                          </Badge>
                        )}
                      </div>
                      
                      {(subtask.due_date || subtask.assignee) && (
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                           {subtask.due_date && (
                             <div className="flex items-center gap-1">
                               <CalendarIcon className="h-3 w-3" />
                               {format(new Date(subtask.due_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                             </div>
                          )}
                          {subtask.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {subtask.assignee.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditSubtask(subtask)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {subtasks?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma atividade criada ainda.</p>
                    <p className="text-sm">Clique em "Nova Atividade" para começar.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}