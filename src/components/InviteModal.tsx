import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, UserPlus } from 'lucide-react';
import { useInviteTeamMember, type Team } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
}

export function InviteModal({ isOpen, onClose, team }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const inviteTeamMember = useInviteTeamMember();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    console.log('🎯 Modal: Iniciando envio de convite...', { 
      email: email.trim(), 
      role, 
      team_name: team.name,
      team_id: team.id 
    });

    try {
      console.log('🔄 Modal: Chamando mutation...');
      await inviteTeamMember.mutateAsync({
        team_id: team.id,
        email: email.trim(),
        role
      });
      
      console.log('🎉 Modal: Convite enviado com sucesso!');
      toast({
        title: "Convite enviado!",
        description: `Um convite foi enviado para ${email.trim()}.`
      });
      
      setEmail('');
      setRole('member');
      onClose();
    } catch (error) {
      console.error('💥 Modal: Erro ao enviar convite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o convite.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar para "{team.name}"
          </DialogTitle>
          <DialogDescription>
            Digite o e-mail da pessoa que você deseja convidar para sua equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função na Equipe</Label>
            <Select value={role} onValueChange={(value: 'member' | 'admin') => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Administradores podem gerenciar tarefas e convidar novos membros.
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={inviteTeamMember.isPending || !email.trim()}
              className="flex-1"
            >
              {inviteTeamMember.isPending ? 'Enviando...' : 'Enviar Convite'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}