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
import { Plus, CalendarIcon, User, Edit, Trash2, CheckSquare, Circle, RotateCcw } from 'lucide-react';
import { useCreateTask, useUpdateTask, useDeleteTask, useSubtasks, useCreateSubtask, useUpdateSubtask, useDeleteSubtask, useToggleSubtaskStatus, useTeamMembers, useSubtaskAssignees, useSetSubtaskAssignees, type Team } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';

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
  const [subtaskAssignees, setSubtaskAssignees] = useState<string[]>([]);
  const [subtaskPriority, setSubtaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: subtasks } = useSubtasks(task?.id);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const toggleSubtaskStatus = useToggleSubtaskStatus();
  const { user } = useAuth();
  const { data: teamMembers } = useTeamMembers(task?.team_id);
  const { data: currentAssignees } = useSubtaskAssignees(editingSubtask?.id);
  const setSubtaskAssigneesMutation = useSetSubtaskAssignees();
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
      assignees: subtaskAssignees,
      isEditing: !!editingSubtask
    });

    try {
      let subtaskId = editingSubtask?.id;
      
      if (editingSubtask) {
        console.log('Atualizando subtarefa ID:', editingSubtask.id);
        await updateSubtask.mutateAsync({
          id: editingSubtask.id,
          task_id: task.id,
          title: subtaskTitle.trim(),
          description: subtaskDescription.trim() || undefined,
          due_date: formattedDueDate,
          assignee_id: subtaskAssignees[0] || undefined, // Manter compatibilidade com legado
          priority: subtaskPriority
        });
      } else {
        const newSubtask = await createSubtask.mutateAsync({
          task_id: task.id,
          title: subtaskTitle.trim(),
          description: subtaskDescription.trim() || undefined,
          due_date: formattedDueDate,
          assignee_id: subtaskAssignees[0] || undefined, // Manter compatibilidade com legado
          priority: subtaskPriority
        });
        subtaskId = newSubtask.id;
      }

      // Definir múltiplos responsáveis
      if (subtaskId && subtaskAssignees.length > 0) {
        await setSubtaskAssigneesMutation.mutateAsync({
          subtaskId,
          userIds: subtaskAssignees
        });
      }

      // Configurar recorrência semanal se habilitada
      if (subtaskId && isRecurring && recurrenceWeekdays.length > 0) {
        // Determinar o ID efetivo do parent (modelo da recorrência)
        const effectiveParentId = editingSubtask ? getEffectiveParentId(editingSubtask) : subtaskId;
        
        const formattedEndDate = recurrenceEndDate ? 
          `${recurrenceEndDate.getFullYear()}-${String(recurrenceEndDate.getMonth() + 1).padStart(2, '0')}-${String(recurrenceEndDate.getDate()).padStart(2, '0')}` : null;
        
        const { error } = await supabase.rpc('set_subtask_weekly_recurrence', {
          p_parent: effectiveParentId,
          p_weekdays: recurrenceWeekdays,
          p_end_date: formattedEndDate,
          p_timezone: 'America/Fortaleza'
        });

        if (error) {
          console.error('Erro ao salvar recorrência:', error);
          toast({
            title: "Erro na recorrência",
            description: `Erro ao configurar repetição: ${error.message}`,
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: editingSubtask ? "Atividade atualizada" : "Atividade criada",
        description: editingSubtask ? "As alterações foram salvas com sucesso." : "A nova atividade foi criada com sucesso."
      });
      
      // Reset form
      setSubtaskTitle('');
      setSubtaskDescription('');
      setSubtaskDueDate(undefined);
      setSubtaskAssignees([]);
      setSubtaskPriority('medium');
      setIsRecurring(false);
      setRecurrenceWeekdays([]);
      setRecurrenceEndDate(undefined);
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
    setSubtaskPriority(subtask.priority || 'medium');
    // Os responsáveis serão carregados pelo useEffect quando currentAssignees estiver disponível
    setSubtaskAssignees([]);
    setIsSubtaskFormOpen(true);
  };

  // Função para determinar o ID efetivo do parent (modelo da recorrência)
  const getEffectiveParentId = (subtask: any) => {
    if (!subtask) return null;
    return subtask.recurrence_parent_id && subtask.recurrence_parent_id !== subtask.id
      ? subtask.recurrence_parent_id  // estou numa ocorrência → o pai é o "modelo"
      : subtask.id;                    // estou no "modelo" → o pai é ele mesmo
  };

  // Função para carregar configuração de recorrência
  const loadRecurrenceSettings = async (effectiveParentId: string) => {
    try {
      const { data, error } = await supabase
        .from('subtask_recurrences')
        .select('weekdays, end_date, timezone')
        .eq('parent_subtask_id', effectiveParentId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading recurrence:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error loading recurrence settings:', error);
      return null;
    }
  };

  // UseEffect para carregar responsáveis quando currentAssignees estiver disponível
  useEffect(() => {
    if (editingSubtask && currentAssignees) {
      setSubtaskAssignees(currentAssignees.map(a => a.user_id));
    } else if (editingSubtask && !currentAssignees && editingSubtask.assignee_id) {
      // Fallback para o campo legado se não houver responsáveis na nova tabela
      setSubtaskAssignees([editingSubtask.assignee_id]);
    }
  }, [editingSubtask, currentAssignees]);

  // UseEffect para carregar configurações de recorrência ao editar subtarefa
  useEffect(() => {
    if (editingSubtask) {
      const effectiveParentId = getEffectiveParentId(editingSubtask);
      console.log('Loading recurrence settings for subtask:', {
        subtaskId: editingSubtask.id,
        effectiveParentId,
        isRecurring: editingSubtask.is_recurring,
        recurrenceParentId: editingSubtask.recurrence_parent_id
      });
      
      if (effectiveParentId) {
        loadRecurrenceSettings(effectiveParentId).then(recurrence => {
          console.log('Loaded recurrence settings:', recurrence);
          if (recurrence) {
            setIsRecurring(true);
            setRecurrenceWeekdays(recurrence.weekdays || []);
            setRecurrenceEndDate(recurrence.end_date ? new Date(recurrence.end_date + 'T00:00:00') : undefined);
          } else {
            setIsRecurring(false);
            setRecurrenceWeekdays([]);
            setRecurrenceEndDate(undefined);
          }
        });
      }
    } else {
      // Reset quando não estiver editando
      setIsRecurring(false);
      setRecurrenceWeekdays([]);
      setRecurrenceEndDate(undefined);
    }
  }, [editingSubtask]);

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
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {editingSubtask ? 'Editar Atividade' : 'Nova Atividade'}
                    </h4>
                    {editingSubtask && editingSubtask.recurrence_parent_id && 
                     editingSubtask.recurrence_parent_id !== editingSubtask.id && (
                      <Badge variant="outline" className="text-xs">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Ocorrência recorrente
                      </Badge>
                    )}
                  </div>
                  
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
                    
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={subtaskPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setSubtaskPriority(value)}>
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

                    {/* Recurrence Section */}
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          <Label htmlFor="recurring">Repetir semanalmente</Label>
                        </div>
                        <Switch
                          id="recurring"
                          checked={isRecurring}
                          onCheckedChange={setIsRecurring}
                        />
                      </div>

                      {isRecurring && (
                        <div className="space-y-3 pl-6">
                          <div className="space-y-2">
                            <Label>Dias da semana</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { value: 1, label: 'Seg' },
                                { value: 2, label: 'Ter' },
                                { value: 3, label: 'Qua' },
                                { value: 4, label: 'Qui' },
                                { value: 5, label: 'Sex' },
                                { value: 6, label: 'Sáb' },
                                { value: 7, label: 'Dom' }
                              ].map(day => (
                                <div key={day.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`day-${day.value}`}
                                    checked={recurrenceWeekdays.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setRecurrenceWeekdays(prev => [...prev, day.value].sort());
                                      } else {
                                        setRecurrenceWeekdays(prev => prev.filter(d => d !== day.value));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`day-${day.value}`} className="text-sm">
                                    {day.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Repetir até (opcional)</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="justify-start">
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  {recurrenceEndDate ? 
                                    format(recurrenceEndDate, 'dd/MM/yyyy', { locale: ptBR }) : 
                                    'Selecionar data'
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={recurrenceEndDate}
                                  onSelect={setRecurrenceEndDate}
                                  locale={ptBR}
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            {recurrenceEndDate && (
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm"
                                onClick={() => setRecurrenceEndDate(undefined)}
                                className="text-xs text-muted-foreground"
                              >
                                Remover data limite
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
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
                      
                      <div className="space-y-2">
                        <Label>Responsáveis</Label>
                        <div className="border rounded-md p-2 min-h-[40px] flex flex-wrap gap-1">
                          {subtaskAssignees.map(assigneeId => {
                            const member = assigneeId === user?.id ? 
                              { user_id: user.id, name: 'Eu mesmo', photo_url: null } :
                              teamMembers?.find(m => m.user_id === assigneeId);
                            if (!member) return null;
                            return (
                              <Badge key={assigneeId} variant="secondary" className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={member.photo_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {member.name?.charAt(0).toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{member.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setSubtaskAssignees(prev => prev.filter(id => id !== assigneeId))}
                                  className="ml-1 text-xs hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            );
                          })}
                          {subtaskAssignees.length === 0 && (
                            <span className="text-sm text-muted-foreground">Nenhum responsável</span>
                          )}
                        </div>
                        <Select 
                          value=""
                          onValueChange={(value) => {
                            if (value && !subtaskAssignees.includes(value)) {
                              setSubtaskAssignees(prev => [...prev, value]);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Adicionar responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            {user && !subtaskAssignees.includes(user.id) && (
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
                            {teamMembers?.filter(member => 
                              member.user_id !== user?.id && !subtaskAssignees.includes(member.user_id)
                            ).map((member) => (
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
                          setSubtaskAssignees([]);
                          setSubtaskPriority('medium');
                          setIsRecurring(false);
                          setRecurrenceWeekdays([]);
                          setRecurrenceEndDate(undefined);
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
                        {/* Recurring Badge */}
                        {(subtask as any).is_recurring && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            Semanal
                          </Badge>
                        )}
                        {/* Priority Badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            (subtask.priority || 'medium') === 'high' 
                              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300' 
                              : (subtask.priority || 'medium') === 'medium'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                          }`}
                        >
                          {(subtask.priority || 'medium') === 'high' ? 'Alta' : 
                           (subtask.priority || 'medium') === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
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