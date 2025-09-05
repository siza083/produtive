import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface GrantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onSuccess?: () => void;
}

interface Permissions {
  can_create_tasks: boolean;
  can_create_subtasks: boolean;
  can_assign: boolean;
  can_invite: boolean;
  can_remove_members: boolean;
}

export function GrantAccessModal({ isOpen, onClose, teamId, onSuccess }: GrantAccessModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");
  const [permissions, setPermissions] = useState<Permissions>({
    can_create_tasks: false,
    can_create_subtasks: false,
    can_assign: false,
    can_invite: false,
    can_remove_members: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('add_member_by_email', {
        p_team: teamId,
        p_email: email.trim(),
        p_role: role,
        p_permissions: permissions as any,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Acesso concedido",
        description: "O usuário foi adicionado à equipe com sucesso.",
      });

      setEmail("");
      setRole("member");
      setPermissions({
        can_create_tasks: false,
        can_create_subtasks: false,
        can_assign: false,
        can_invite: false,
        can_remove_members: false,
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      let errorMessage = "Erro ao conceder acesso.";
      
      if (error.message?.includes("User not found")) {
        errorMessage = "Usuário não encontrado. Peça para ele se cadastrar na Produtive e tente novamente.";
      } else if (error.message?.includes("not allowed")) {
        errorMessage = "Você não tem permissão para realizar esta ação.";
      } else if (error.message?.includes("Only owner can grant owner role")) {
        errorMessage = "Apenas o proprietário pode conceder o papel de proprietário.";
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

  const handlePermissionChange = (permission: keyof Permissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: value,
    }));
  };

  const handleClose = () => {
    setEmail("");
    setRole("member");
    setPermissions({
      can_create_tasks: false,
      can_create_subtasks: false,
      can_assign: false,
      can_invite: false,
      can_remove_members: false,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Compartilhar Acesso
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do usuário</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              required
            />
            <p className="text-sm text-muted-foreground">
              O usuário deve ter uma conta existente na Produtive.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="owner">Proprietário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Permissões Avançadas</CardTitle>
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

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Concedendo..." : "Conceder Acesso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}