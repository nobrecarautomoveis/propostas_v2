/**
 * Hook para gerenciar atividades de propostas
 * 
 * Features:
 * - Real-time updates (polling a cada 10 segundos)
 * - CRUD completo
 * - Permissão total para todos os usuários
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getActivitiesByProposal, 
  createActivity, 
  updateActivity, 
  deleteActivity,
  countActivitiesByProposal
} from '@/services/activities.service';
import type { ActivityWithUser } from '@/lib/supabase/types';

export interface UseActivitiesOptions {
  proposalId: string;
  enabled?: boolean;
  pollingInterval?: number; // ms (padrão: 10000 = 10s)
}

export function useActivities(options: UseActivitiesOptions) {
  const { proposalId, enabled = true, pollingInterval = 10000 } = options;

  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Função para buscar atividades
  const fetchActivities = useCallback(async () => {
    if (!enabled || !proposalId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getActivitiesByProposal(proposalId);
      setActivities(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar atividades:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [proposalId, enabled]);

  // Fetch inicial
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Polling para real-time updates
  useEffect(() => {
    if (!enabled || !proposalId) return;

    const intervalId = setInterval(() => {
      fetchActivities();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enabled, proposalId, pollingInterval, fetchActivities]);

  // Função para refetch manual
  const refetch = useCallback(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook para mutations de atividades
 */
export function useActivityMutations() {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const create = useCallback(async (data: {
    proposalId: string;
    userId: string;
    description: string;
  }) => {
    setIsCreating(true);
    try {
      const activity = await createActivity(data);
      return activity;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const update = useCallback(async (activityId: string, data: {
    description: string;
  }) => {
    setIsUpdating(true);
    try {
      const activity = await updateActivity(activityId, data);
      return activity;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const remove = useCallback(async (activityId: string) => {
    setIsDeleting(true);
    try {
      await deleteActivity(activityId);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

/**
 * Hook para contar atividades
 */
export function useActivityCount(proposalId: string) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!proposalId) {
      setIsLoading(false);
      return;
    }

    countActivitiesByProposal(proposalId)
      .then(setCount)
      .finally(() => setIsLoading(false));
  }, [proposalId]);

  return { count, isLoading };
}
