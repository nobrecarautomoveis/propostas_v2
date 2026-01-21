'use client';

/**
 * Hook de Autenticação
 * Substitui o useCurrentUser do Convex
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { User } from '@/lib/supabase';
import { 
  getSession, 
  logout as authLogout,
  type AuthSession 
} from '@/services/auth.service';

interface UseAuthReturn {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSession>({ userId: null, isAuthenticated: false });
  const router = useRouter();

  // Função para buscar usuário
  const fetchUser = useCallback(async (userId: string) => {
    try {
      const supabase = getSupabaseClient();
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('❌ Usuário não encontrado:', userId);
        authLogout();
        setCurrentUser(null);
        router.replace('/');
        return;
      }

      setCurrentUser(user);
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      authLogout();
      setCurrentUser(null);
    }
  }, [router]);

  // Função para atualizar usuário
  const refreshUser = useCallback(async () => {
    const currentSession = getSession();
    if (currentSession.userId) {
      await fetchUser(currentSession.userId);
    }
  }, [fetchUser]);

  // Efeito inicial para verificar sessão
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      const currentSession = getSession();
      setSession(currentSession);

      if (currentSession.userId) {
        await fetchUser(currentSession.userId);
      }

      setIsLoading(false);
    };

    initAuth();
  }, [fetchUser]);

  // Função de logout
  const logout = useCallback(() => {
    authLogout();
    setCurrentUser(null);
    setSession({ userId: null, isAuthenticated: false });
    window.location.href = '/';
  }, []);

  return {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    logout,
    refreshUser,
  };
}

// Alias para manter compatibilidade
export const useCurrentUser = useAuth;

