'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Verifica imediatamente se há autenticação
    const checkAuth = () => {
      const hasLocalStorage = typeof window !== 'undefined' && window.localStorage.getItem('userId');
      const hasCookie = typeof document !== 'undefined' && document.cookie.includes('userId=');

      if (!hasLocalStorage && !hasCookie) {
        router.replace('/');
        return false;
      }
      return true;
    };

    if (!hasCheckedAuth) {
      const hasAuth = checkAuth();
      setHasCheckedAuth(true);
      if (!hasAuth) return;
    }

    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/');
      } else {
        setShouldRender(true);
      }
    }
  }, [isLoading, isAuthenticated, router, hasCheckedAuth]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading || !shouldRender || !hasCheckedAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Só renderiza se autenticado
  return isAuthenticated ? <>{children}</> : null;
}