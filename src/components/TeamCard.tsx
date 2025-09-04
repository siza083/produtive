import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Crown, UserPlus, UserX, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useData';

interface TeamCardProps {
  team: any;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onInviteClick: () => void;
}

export function TeamCard({ team, isExpanded, onToggleExpansion, onInviteClick }: TeamCardProps) {
  const { data: members, isLoading } = useTeamMembers(team.id);

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      default:
        return 'Membro';
    }
  };

  const getRoleVariant = (role: string) => {
    return role === 'owner' ? 'default' : 'secondary';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {team.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium">{team.name}</h4>
            <div className="flex items-center gap-2">
              <Badge variant={getRoleVariant(team.role)}>
                {team.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                {getRoleDisplay(team.role)}
              </Badge>
              {members && (
                <span className="text-sm text-muted-foreground">
                  {members.length} {members.length === 1 ? 'membro' : 'membros'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {(team.role === 'owner' || team.role === 'admin') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onInviteClick}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar
            </Button>
          )}
          
          {team.role !== 'owner' && (
            <Button variant="outline" size="sm">
              <UserX className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}
          
          <Collapsible open={isExpanded} onOpenChange={onToggleExpansion}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Membros
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>
      
      <Collapsible open={isExpanded} onOpenChange={onToggleExpansion}>
        <CollapsibleContent>
          <div className="border-t bg-muted/50 p-4">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Carregando membros...
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                <h5 className="font-medium text-sm">Membros da Equipe</h5>
                <div className="space-y-2">
                  {members.map((member: any) => (
                    <div key={member.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profiles?.photo_url} />
                          <AvatarFallback>
                            {member.profiles?.name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.profiles?.name || 'Nome não informado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getRoleVariant(member.role)} className="text-xs">
                        {member.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                        {getRoleDisplay(member.role)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum membro encontrado</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}