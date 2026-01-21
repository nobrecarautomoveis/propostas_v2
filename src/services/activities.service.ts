/**
 * Serviço de Atividades de Propostas
 * 
 * Gerencia CRUD de atividades/anotações relacionadas às propostas
 */

import { getSupabaseClient } from '@/lib/supabase';
import type { Activity, ActivityInsert, ActivityUpdate, ActivityWithUser } from '@/lib/supabase/types';

/**
 * Buscar todas as atividades de uma proposta
 */
export async function getActivitiesByProposal(proposalId: string): Promise<ActivityWithUser[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('proposal_activities')
    .select(`
      *,
      user:users(id, name, email)
    `)
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar atividades:', error);
    throw new Error(`Erro ao buscar atividades: ${error.message}`);
  }

  return (data || []) as ActivityWithUser[];
}

/**
 * Criar nova atividade
 */
export async function createActivity(data: {
  proposalId: string;
  userId: string;
  description: string;
}): Promise<Activity> {
  const supabase = getSupabaseClient();

  const activityData: ActivityInsert = {
    proposal_id: data.proposalId,
    user_id: data.userId,
    description: data.description,
  };

  const { data: activity, error } = await supabase
    .from('proposal_activities')
    .insert(activityData)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar atividade:', error);
    throw new Error(`Erro ao criar atividade: ${error.message}`);
  }

  console.log('✅ Atividade criada:', activity.id);
  return activity;
}

/**
 * Atualizar atividade existente
 */
export async function updateActivity(
  activityId: string,
  data: {
    description: string;
  }
): Promise<Activity> {
  const supabase = getSupabaseClient();

  const activityData: ActivityUpdate = {
    description: data.description,
  };

  const { data: activity, error } = await supabase
    .from('proposal_activities')
    .update(activityData)
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar atividade:', error);
    throw new Error(`Erro ao atualizar atividade: ${error.message}`);
  }

  console.log('✅ Atividade atualizada:', activity.id);
  return activity;
}

/**
 * Deletar atividade
 */
export async function deleteActivity(activityId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('proposal_activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    console.error('❌ Erro ao deletar atividade:', error);
    throw new Error(`Erro ao deletar atividade: ${error.message}`);
  }

  console.log('✅ Atividade deletada:', activityId);
}

/**
 * Contar atividades de uma proposta
 */
export async function countActivitiesByProposal(proposalId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('proposal_activities')
    .select('*', { count: 'exact', head: true })
    .eq('proposal_id', proposalId);

  if (error) {
    console.error('❌ Erro ao contar atividades:', error);
    return 0;
  }

  return count || 0;
}
