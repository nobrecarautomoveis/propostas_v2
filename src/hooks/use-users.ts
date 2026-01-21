'use client';

/**
 * Hook para gerenciamento de usuários
 * Substitui useQuery/useMutation do Convex para usuários
 */
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/supabase';
import { 
  getAllUsers, 
  getUsersForAdmin,
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  type CreateUserData,
  type UpdateUserData,
} from '@/services/users.service';

interface UseUsersOptions {
  requesterId?: string;
  adminOnly?: boolean;
}

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para listar usuários
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!options.requesterId) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let data: User[];
      
      if (options.adminOnly) {
        data = await getUsersForAdmin(options.requesterId);
      } else {
        data = await getAllUsers(options.requesterId);
      }
      
      setUsers(data);
    } catch (err) {
      console.error('❌ Erro ao buscar usuários:', err);
      setError(err instanceof Error ? err : new Error('Erro ao buscar usuários'));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.requesterId, options.adminOnly]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
  };
}

interface UseUserMutationsReturn {
  createUser: (data: CreateUserData) => Promise<User>;
  updateUser: (userId: string, data: UpdateUserData) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook para mutações de usuários (create, update, delete)
 */
export function useUserMutations(): UseUserMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createUser = useCallback(async (data: CreateUserData): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await createUserService(data);
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar usuário');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, data: UpdateUserData): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await updateUserService(userId, data);
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar usuário');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteUserService(userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao deletar usuário');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createUser,
    updateUser,
    deleteUser,
    isLoading,
    error,
  };
}

