import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    user_id: string;
    role: string;
    permissions?: any;
    profile?: {
      name?: string;
      photo_url?: string;
    };
  };
  teamId: string;
  currentUserRole: string;
  onSuccess?: () => void;
}

interface Permissions {
  can_create_tasks: boolean;
  can_create_subtasks: boolean;
  can_assign: boolean;
  can_invite: boolean;
  can_remove_members: boolean;
}

export function MemberManagementModal({ 
  isOpen, 
  onClose, 
  member, 
  teamId, 
  currentUserRole,
  onSuccess 
}: MemberManagementModalProps) {
  const [role, setRole] = useState<string>(member.role);
  const [permissions, setPermissions] = useState<Permissions>(() => {
    const memberPermissions = member.permissions || {};
    return {
      can_create_tasks: memberPermissions.can_create_tasks || false,
      can_create_subtasks: memberPermissions.can_create_subtasks || false,
      can_assign: memberPermissions.can_assign || false,
      can_invite: memberPermissions.can_invite || false,
      can_remove_members: memberPermissions.can_remove_members || false,
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();

  const canEdit = currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role !== 'owner');
  const canRemove = currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role !== 'owner');

  const handleUpdate = async () => {
    if (!canEdit) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('update_member_access', {
        p_team: teamId,
        p_user: member.user_id,
        p_role: role,
        p_permissions: permissions as any,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Membro atualizado",
        description: "As permissões do membro foram atualizadas com sucesso.",
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      let errorMessage = "Erro ao atualizar membro.";
      
      if (error.message?.includes("not allowed")) {
        errorMessage = "Você não tem permissão para realizar esta ação.";
      } else if (error.message?.includes("Admin cannot modify owner")) {
        errorMessage = "Administradores não podem modificar proprietários.";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!canRemove) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase.rpc('remove_member', {
        p_team: teamId,
        p_user: member.user_id,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Membro removido",
        description: "O membro foi removido da equipe com sucesso.",
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      let errorMessage = "Erro ao remover membro.";
      
      if (error.message?.includes("not allowed")) {
        errorMessage = "Você não tem permissão para realizar esta ação.";
      } else if (error.message?.includes("Admin cannot remove owner")) {
        errorMessage = "Administradores não podem remover proprietários.";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handlePermissionChange = (permission: keyof Permissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Gerenciar Membro
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="font-medium">{member.profile?.name || "Nome não disponível"}</p>
            <p className="text-sm text-muted-foreground">Papel atual: {member.role}</p>
          </div>

          {canEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Novo Papel</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    {currentUserRole === 'owner' && (
                      <SelectItem value="owner">Proprietário</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Permissões</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="can_create_tasks" className="text-sm font-normal">
                      Criar tarefas
                    </Label>
                    <Switch
                      id="can_create_tasks"
                      checked={permissions.can_create_tasks}
                      onCheckedChange={(value) => handlePermissionChange('can_create_tasks', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="can_create_subtasks" className="text-sm font-normal">
                      Criar subtarefas
                    </Label>
                    <Switch
                      id="can_create_subtasks"
                      checked={permissions.can_create_subtasks}
                      onCheckedChange={(value) => handlePermissionChange('can_create_subtasks', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="can_assign" className="text-sm font-normal">
                      Atribuir tarefas
                    </Label>
                    <Switch
                      id="can_assign"
                      checked={permissions.can_assign}
                      onCheckedChange={(value) => handlePermissionChange('can_assign', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="can_invite" className="text-sm font-normal">
                      Convidar membros
                    </Label>
                    <Switch
                      id="can_invite"
                      checked={permissions.can_invite}
                      onCheckedChange={(value) => handlePermissionChange('can_invite', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="can_remove_members" className="text-sm font-normal">
                      Remover membros
                    </Label>
                    <Switch
                      id="can_remove_members"
                      checked={permissions.can_remove_members}
                      onCheckedChange={(value) => handlePermissionChange('can_remove_members', value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {canRemove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza de que deseja remover este membro da equipe? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} disabled={isRemoving}>
                      {isRemoving ? "Removendo..." : "Remover"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <div className="flex-1 flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              {canEdit && (
                <Button onClick={handleUpdate} disabled={isLoading} className="flex-1">
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}