import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  role?: 'owner' | 'admin' | 'member';
  status?: 'pending' | 'accepted';
}

export interface Task {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  deleted_at?: string;
  team?: Team;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  due_date?: string;
  assignee_id?: string;
  status: 'open' | 'done';
  completed_at?: string;
  created_by: string;
  created_at: string;
  deleted_at?: string;
  task?: Task;
  assignee?: { name?: string; photo_url?: string };
}

export interface Profile {
  user_id: string;
  name?: string;
  photo_url?: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user
  });
}

export function useTeams() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!team_members_team_id_fkey!inner(role, status)
        `)
        .eq('team_members.user_id', user.id)
        .eq('team_members.status', 'accepted');

      if (error) throw error;
      
      return data.map(team => ({
        ...team,
        role: team.team_members[0]?.role,
        status: team.team_members[0]?.status
      })) as Team[];
    },
    enabled: !!user
  });
}

export function useTasks(teamId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', teamId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('tasks')
        .select(`
          *,
          team:teams!tasks_team_id_fkey(id, name),
          subtasks!subtasks_task_id_fkey(id, status, deleted_at)
        `)
        .is('deleted_at', null);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(task => ({
        ...task,
        team: task.team ? {
          id: task.team.id,
          name: task.team.name,
          created_by: '',
          created_at: ''
        } : undefined,
        openSubtasks: task.subtasks?.filter(s => s.status === 'open' && !s.deleted_at).length || 0,
        totalSubtasks: task.subtasks?.filter(s => !s.deleted_at).length || 0
      })) as any[];
    },
    enabled: !!user
  });
}

export function useDashboardData() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  
  const userTimezone = profile?.timezone || 'America/Sao_Paulo';
  const today = dayjs().tz(userTimezone).format('YYYY-MM-DD');
  const weekStart = dayjs().tz(userTimezone).startOf('isoWeek').format('YYYY-MM-DD');
  const weekEnd = dayjs().tz(userTimezone).endOf('isoWeek').format('YYYY-MM-DD');

  return useQuery({
    queryKey: ['dashboard', user?.id, today, weekStart, weekEnd],
    queryFn: async () => {
      if (!user) return null;

      console.log('Dashboard query starting for user:', user.id);

      // Get only subtasks assigned to the current user
      const { data: subtasks, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('assignee_id', user.id)
        .is('deleted_at', null);

      console.log('Dashboard subtasks query result:', { subtasks, error });

      if (error) {
        console.error('Dashboard query error:', error);
        throw error;
      }

      // Get task and team data separately
      const taskIds = [...new Set((subtasks || []).map(s => s.task_id))];
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          team_id,
          team:teams(
            id,
            name,
            team_members(user_id, status)
          )
        `)
        .in('id', taskIds);

      // Create a map of tasks by ID
      const tasksMap = new Map();
      (tasks || []).forEach(task => {
        tasksMap.set(task.id, task);
      });

      // Filter subtasks to only include those from teams the user is part of
      const validSubtasks = (subtasks || []).filter(subtask => {
        const task = tasksMap.get(subtask.task_id);
        if (!task?.team?.team_members) return false;
        return task.team.team_members.some((member: any) => 
          member.user_id === user.id && member.status === 'accepted'
        );
      });

      // Calculate metrics
      const todayTasks = validSubtasks.filter(s => 
        s.status === 'open' && s.due_date === today
      ).length;

      const overdueTasks = validSubtasks.filter(s => 
        s.status === 'open' && s.due_date && s.due_date < today
      ).length;

      const weekTasks = validSubtasks.filter(s => 
        s.due_date && s.due_date >= weekStart && s.due_date <= weekEnd
      ).length;

      const completedThisWeek = validSubtasks.filter(s => 
        s.status === 'done' && s.completed_at && 
        dayjs(s.completed_at).tz(userTimezone).format('YYYY-MM-DD') >= weekStart &&
        dayjs(s.completed_at).tz(userTimezone).format('YYYY-MM-DD') <= weekEnd
      ).length;

      // Get tasks for the list (overdue + today)
      const listTasks = validSubtasks.filter(s => 
        s.status === 'open' && s.due_date && 
        (s.due_date < today || s.due_date === today)
      ).sort((a, b) => {
        // Overdue first, then by date and title
        const aOverdue = a.due_date! < today;
        const bOverdue = b.due_date! < today;
        
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.due_date !== b.due_date) return a.due_date!.localeCompare(b.due_date!);
        return a.title.localeCompare(b.title);
      });

      // Generate chart data for weekdays (Mon-Fri)
      const chartData = [];
      for (let i = 0; i < 5; i++) {
        const date = dayjs().tz(userTimezone).startOf('isoWeek').add(i, 'day');
        const dateStr = date.format('YYYY-MM-DD');
        const isToday = dateStr === today;
        const isPast = dateStr < today;
        
        const completed = validSubtasks.filter(s => 
          s.status === 'done' && s.completed_at &&
          dayjs(s.completed_at).tz(userTimezone).format('YYYY-MM-DD') === dateStr
        ).length;

        let overdue = 0;
        if (isPast) {
          overdue = validSubtasks.filter(s => 
            s.status === 'open' && s.due_date === dateStr
          ).length;
        } else if (isToday) {
          overdue = validSubtasks.filter(s => 
            s.status === 'open' && s.due_date === dateStr
          ).length;
        }

        chartData.push({
          day: date.format('ddd'),
          date: dateStr,
          completed,
          overdue,
          isToday,
          isPast
        });
      }

      return {
        cards: {
          today: todayTasks,
          overdue: overdueTasks,
          week: weekTasks,
          completed: completedThisWeek
        },
        chartData,
        listTasks: listTasks.map(subtask => {
          const task = tasksMap.get(subtask.task_id);
          return {
            ...subtask,
            task: task ? {
              id: task.id,
              title: task.title,
              team_id: task.team_id,
              created_by: '',
              created_at: '',
              team: task.team ? {
                id: task.team.id,
                name: task.team.name,
                created_by: '',
                created_at: ''
              } : undefined
            } : undefined
          };
        }) as Subtask[]
      };
    },
    enabled: !!user && !!profile,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

export function useCreateTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      console.log('Creating team via RPC - User:', user);
      
      if (!user) {
        console.error('User not authenticated');
        throw new Error('Not authenticated');
      }

      console.log('Creating team with RPC:', { name: data.name });

      // Use the new RPC function that handles both team creation and owner assignment
      const { data: teamId, error } = await supabase.rpc('create_team', {
        p_name: data.name
      });

      console.log('Team RPC result:', { teamId, error });

      if (error) {
        console.error('Team creation error:', error);
        throw error;
      }

      // Fetch the created team to return it for consistency
      const { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (fetchError) {
        console.error('Team fetch error:', fetchError);
        throw fetchError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    }
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      console.log('Deleting team via RPC:', teamId);

      const { error } = await supabase.rpc('delete_team', {
        p_team_id: teamId
      });

      if (error) {
        console.error('Team deletion error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    }
  });
}

export function useToggleSubtaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'done' }) => {
      const { error } = await supabase
        .from('subtasks')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    }
  });
}

export function useCreateSampleData() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const userTimezone = profile?.timezone || 'America/Sao_Paulo';
      const today = dayjs().tz(userTimezone);
      const weekStart = today.startOf('isoWeek').add(1, 'day'); // Monday

      // 1) Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: 'Equipe Produtive',
          created_by: user.id
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
          status: 'accepted'
        });

      if (memberError) throw memberError;

      // 2) Create tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .insert([
          {
            team_id: team.id,
            title: 'Operação',
            description: 'Tarefas operacionais do dia a dia',
            created_by: user.id
          },
          {
            team_id: team.id,
            title: 'Marketing',
            description: 'Atividades de marketing e comunicação',
            created_by: user.id
          }
        ])
        .select();

      if (tasksError) throw tasksError;

      // 3) Create subtasks
      const operacaoTask = tasks.find(t => t.title === 'Operação');
      const marketingTask = tasks.find(t => t.title === 'Marketing');

      if (operacaoTask && marketingTask) {
        const { error: subtasksError } = await supabase
          .from('subtasks')
          .insert([
            {
              task_id: operacaoTask.id,
              title: 'Revisar contratos',
              description: 'Revisar contratos pendentes de aprovação',
              assignee_id: user.id,
              due_date: weekStart.format('YYYY-MM-DD'),
              status: 'open',
              created_by: user.id
            },
            {
              task_id: operacaoTask.id,
              title: 'Rodar conciliações',
              description: 'Executar processo de conciliação bancária',
              assignee_id: user.id,
              due_date: today.subtract(1, 'day').format('YYYY-MM-DD'),
              status: 'open',
              created_by: user.id
            },
            {
              task_id: marketingTask.id,
              title: 'Aprovar criativos',
              description: 'Revisar e aprovar materiais criativos',
              assignee_id: user.id,
              due_date: today.format('YYYY-MM-DD'),
              status: 'open',
              created_by: user.id
            },
            {
              task_id: marketingTask.id,
              title: 'Post do blog',
              description: 'Escrever artigo sobre produtividade',
              assignee_id: user.id,
              due_date: today.subtract(2, 'day').format('YYYY-MM-DD'),
              status: 'done',
              created_by: user.id
            }
          ]);

        if (subtasksError) throw subtasksError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; description?: string; team_id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...data,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

export function useSubtasks(taskId?: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Get assignee data separately if needed
      const subtasksWithAssignees = await Promise.all(
        (data || []).map(async (subtask) => {
          if (subtask.assignee_id) {
            const { data: assignee } = await supabase
              .from('profiles')
              .select('name, photo_url')
              .eq('user_id', subtask.assignee_id)
              .single();
            
            return { ...subtask, assignee };
          }
          return { ...subtask, assignee: null };
        })
      );

      return subtasksWithAssignees as Subtask[];
    },
    enabled: !!taskId
  });
}

export function useCreateSubtask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      task_id: string; 
      title: string; 
      description?: string; 
      due_date?: string; 
      assignee_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: subtask, error } = await supabase
        .from('subtasks')
        .insert({
          ...data,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return subtask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.task_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, task_id, ...data }: { 
      id: string; 
      task_id?: string;
      title?: string; 
      description?: string; 
      due_date?: string; 
      assignee_id?: string;
    }) => {
      const { error } = await supabase
        .from('subtasks')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      // Get the task_id if not provided
      if (!task_id) {
        const { data: subtaskData } = await supabase
          .from('subtasks')
          .select('task_id')
          .eq('id', id)
          .single();
        task_id = subtaskData?.task_id;
      }
      
      return { id, task_id };
    },
    onSuccess: (result) => {
      if (result?.task_id) {
        queryClient.invalidateQueries({ queryKey: ['subtasks', result.task_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

// Hook para buscar membros de uma equipe
export function useTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data: members, error } = await supabase
        .from('team_members')
        .select('user_id, role, status, joined_at, permissions')
        .eq('team_id', teamId)
        .eq('status', 'accepted');

      if (error) {
        console.error('❌ Erro ao buscar membros da equipe:', error);
        throw error;
      }
      
      // Get display names using the SQL function that accesses auth.users directly
      const membersWithProfiles = await Promise.all(
        (members || []).map(async (member) => {
          const { data: displayName } = await supabase
            .rpc('get_user_display_name', { user_uuid: member.user_id });
          
          return {
            user_id: member.user_id,
            role: member.role,
            status: member.status,
            joined_at: member.joined_at,
            permissions: member.permissions || {},
            profile: {
              name: displayName || 'Usuário',
              photo_url: null
            },
            // Keep backward compatibility
            name: displayName || 'Usuário',
            photo_url: null
          };
        })
      );
      
      console.log('✅ Membros da equipe carregados:', membersWithProfiles);
      return membersWithProfiles;
    },
    enabled: !!teamId
  });
}

export function useInviteTeamMember() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ team_id, email, role }: { 
      team_id: string; 
      email: string; 
      role: 'member' | 'admin';
    }) => {
      console.log('🚀 Iniciando processo de convite:', { team_id, email, role });
      
      // First, insert the team member invitation using RPC
      console.log('📧 Criando convite no banco...');
      const { error: rpcError } = await supabase.rpc('create_team_invite', {
        p_team_id: team_id,
        p_invited_email: email,
        p_role: role
      });

      if (rpcError) {
        console.error('❌ Erro ao criar convite:', rpcError);
        
        // Handle specific known errors with appropriate messages
        if (rpcError.message === 'User is already a member of this team') {
          throw new Error('Este usuário já é membro da equipe.');
        }
        
        // Generic error for other cases to prevent email enumeration
        throw new Error('Não foi possível enviar o convite. Verifique o email e tente novamente.');
      }
      
      console.log('✅ Convite criado no banco com sucesso');
      
      // Get team name for the email
      console.log('🏢 Buscando dados da equipe...');
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('name')
        .eq('id', team_id)
        .single();

      if (teamError) {
        console.error('❌ Erro ao buscar dados da equipe:', teamError);
        // Continue mesmo com erro para não bloquear o processo
      }

      // Send invitation email
      console.log('📬 Enviando email de convite...');
      const { error: emailError } = await supabase.functions.invoke('send-invite', {
        body: {
          team_id,
          team_name: teamData?.name || 'Equipe',
          invited_email: email,
          inviter_name: profile?.name || user?.email?.split('@')[0] || 'Um colega',
          role
        }
      });

      if (emailError) {
        console.error('❌ Erro ao enviar email:', emailError);
        
        // Check for domain verification error from Resend
        if (emailError.message?.includes('DOMAIN_NOT_VERIFIED') || 
            emailError.message?.includes('verify a domain')) {
          throw new Error('Para enviar convites por email, é necessário verificar um domínio no Resend. Acesse https://resend.com/domains para configurar seu domínio.');
        }
        
        // For other email errors, log but don't block the process
        console.log('⚠️ Email não enviado, mas convite foi criado no banco');
      } else {
        console.log('✅ Email enviado com sucesso');
      }
      
      console.log('🎉 Processo de convite finalizado');
    },
    onSuccess: () => {
      console.log('🔄 Invalidando cache das equipes...');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error) => {
      console.error('💥 Erro geral no processo de convite:', error);
      // Error is already handled with generic message to prevent enumeration
    }
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subtasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}