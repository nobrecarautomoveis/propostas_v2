/**
 * Container 2: Timeline de Atividades
 * 
 * Features:
 * - Campo para adicionar nova atividade
 * - Lista de atividades em timeline
 * - CRUD completo (editar/deletar)
 * - Real-time updates (polling 10s)
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Loader2, 
  Send, 
  Pencil, 
  Trash2,
  Check,
  X 
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useActivities, useActivityMutations } from '@/hooks/use-activities';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProposalTimelineProps {
  proposalId: string;
}

export function ProposalTimeline({ proposalId }: ProposalTimelineProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Real-time activities (polling a cada 10s)
  const { activities, isLoading, refetch } = useActivities({ 
    proposalId,
    pollingInterval: 10000 
  });
  
  const { create, update, remove, isCreating, isUpdating, isDeleting } = useActivityMutations();

  // Estado do formulário de nova atividade
  const [newActivityText, setNewActivityText] = useState('');
  
  // Estado de edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Estado de deleção
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Adicionar nova atividade
  const handleAddActivity = async () => {
    if (!newActivityText.trim() || !currentUser?.id) return;

    try {
      await create({
        proposalId,
        userId: currentUser.id,
        description: newActivityText.trim(),
      });

      setNewActivityText('');
      refetch();
      
      toast({
        title: 'Atividade adicionada',
        description: 'A atividade foi adicionada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao adicionar atividade',
        description: 'Não foi possível adicionar a atividade. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Iniciar edição
  const handleStartEdit = (activityId: string, currentText: string) => {
    setEditingId(activityId);
    setEditingText(currentText);
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  // Salvar edição
  const handleSaveEdit = async (activityId: string) => {
    if (!editingText.trim()) return;

    try {
      await update(activityId, { description: editingText.trim() });
      setEditingId(null);
      setEditingText('');
      refetch();
      
      toast({
        title: 'Atividade atualizada',
        description: 'A atividade foi atualizada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a atividade.',
        variant: 'destructive',
      });
    }
  };

  // Deletar atividade
  const handleDelete = async (activityId: string) => {
    try {
      await remove(activityId);
      setDeletingId(null);
      refetch();
      
      toast({
        title: 'Atividade excluída',
        description: 'A atividade foi excluída com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a atividade.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Atividades
          </div>
          <Badge variant="secondary">{activities?.length || 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Campo para adicionar nova atividade */}
        <div className="space-y-2">
          <Textarea
            placeholder="✍️ Digite uma anotação, observação ou atualização..."
            value={newActivityText}
            onChange={(e) => setNewActivityText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleAddActivity();
              }
            }}
            className="min-h-[80px] resize-none"
            disabled={isCreating}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Ctrl + Enter para adicionar
            </span>
            <Button
              onClick={handleAddActivity}
              disabled={!newActivityText.trim() || isCreating}
              size="sm"
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Timeline de Atividades */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {isLoading && !activities ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="relative space-y-6">
              {/* Linha vertical da timeline */}
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-border" />
              
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative pl-8">
                  {/* Círculo da timeline */}
                  <div className="absolute left-0 top-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                    <MessageSquare className="h-3 w-3 text-primary-foreground" />
                  </div>

                  {/* Card da atividade */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 hover:bg-muted/70 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">
                            {activity.user?.name || 'Usuário Desconhecido'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {activity.user?.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {activity.updated_at !== activity.created_at && (
                            <span className="text-xs text-muted-foreground italic">
                              (editado)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações (apenas ADMIN pode editar/excluir) */}
                      {currentUser?.role === 'ADMIN' && (
                        <div className="flex items-center gap-1">
                          {editingId !== activity.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleStartEdit(activity.id, activity.description)}
                                disabled={isUpdating || isDeleting}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeletingId(activity.id)}
                                disabled={isUpdating || isDeleting}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    {editingId === activity.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(activity.id)}
                            disabled={!editingText.trim() || isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-3 w-3" />
                            )}
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            <X className="mr-2 h-3 w-3" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhuma atividade registrada</p>
              <p className="text-xs mt-1">Adicione a primeira anotação acima</p>
            </div>
          )}
        </div>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingId && handleDelete(deletingId)}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
}
