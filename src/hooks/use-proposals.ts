'use client';

/**
 * Hook para gerenciamento de propostas
 * Substitui useQuery/useMutation do Convex para propostas
 */
import { useState, useEffect, useCallback } from 'react';
import type { ProposalWithUser } from '@/lib/supabase';
import {
  getProposals as getProposalsService,
  getProposalById as getProposalByIdService,
  createProposal as createProposalService,
  updateProposal as updateProposalService,
  deleteProposal as deleteProposalService,
  updateBankAnalysis as updateBankAnalysisService,
  type CreateProposalData,
  type UpdateProposalData,
} from '@/services/proposals.service';

interface UseProposalsOptions {
  userId?: string;
}

interface UseProposalsReturn {
  proposals: ProposalWithUser[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para listar propostas
 */
export function useProposals(options: UseProposalsOptions = {}): UseProposalsReturn {
  const [proposals, setProposals] = useState<ProposalWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!options.userId) {
      setProposals([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getProposalsService(options.userId);
      setProposals(data);
      console.log(`📊 Propostas carregadas: ${data.length}`);
    } catch (err) {
      console.error('❌ Erro ao buscar propostas:', err);
      setError(err instanceof Error ? err : new Error('Erro ao buscar propostas'));
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.userId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    isLoading,
    error,
    refetch: fetchProposals,
  };
}

interface UseProposalOptions {
  proposalId?: string;
  userId?: string;
}

interface UseProposalReturn {
  proposal: ProposalWithUser | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para buscar uma proposta específica
 */
export function useProposal(options: UseProposalOptions): UseProposalReturn {
  const [proposal, setProposal] = useState<ProposalWithUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposal = useCallback(async () => {
    if (!options.proposalId || !options.userId) {
      setProposal(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getProposalByIdService(options.proposalId, options.userId);
      setProposal(data);
    } catch (err) {
      console.error('❌ Erro ao buscar proposta:', err);
      setError(err instanceof Error ? err : new Error('Erro ao buscar proposta'));
      setProposal(null);
    } finally {
      setIsLoading(false);
    }
  }, [options.proposalId, options.userId]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  return {
    proposal,
    isLoading,
    error,
    refetch: fetchProposal,
  };
}

interface UseProposalMutationsReturn {
  createProposal: (data: CreateProposalData & Record<string, unknown>) => Promise<{ proposalId: string; proposalNumber: string }>;
  updateProposal: (proposalId: string, data: UpdateProposalData) => Promise<{ success: boolean }>;
  deleteProposal: (proposalId: string, userId: string) => Promise<{ success: boolean }>;
  updateBankAnalysis: (proposalId: string, userId: string, data: Partial<UpdateProposalData>) => Promise<{ success: boolean }>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook para mutações de propostas (create, update, delete)
 */
export function useProposalMutations(): UseProposalMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createProposal = useCallback(async (data: CreateProposalData & Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createProposalService(data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar proposta');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProposal = useCallback(async (proposalId: string, data: UpdateProposalData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await updateProposalService(proposalId, data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar proposta');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteProposal = useCallback(async (proposalId: string, userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteProposalService(proposalId, userId);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao deletar proposta');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBankAnalysis = useCallback(async (proposalId: string, userId: string, data: Partial<UpdateProposalData>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await updateBankAnalysisService(proposalId, userId, data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar análise bancária');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createProposal,
    updateProposal,
    deleteProposal,
    updateBankAnalysis,
    isLoading,
    error,
  };
}

