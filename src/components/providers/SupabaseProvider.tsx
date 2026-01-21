"use client";

/**
 * Provider do Supabase
 * Substitui o ConvexClientProvider
 */
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Tipos
interface SupabaseContextValue {
  isReady: boolean;
}

// Contexto
const SupabaseContext = createContext<SupabaseContextValue>({
  isReady: false,
});

// Hook para usar o contexto
export function useSupabaseContext() {
  return useContext(SupabaseContext);
}

// Props do provider
interface SupabaseProviderProps {
  children: ReactNode;
}

/**
 * Provider que inicializa e disponibiliza o cliente Supabase
 */
export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Verifica se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        "⚠️ Variáveis de ambiente do Supabase não configuradas. " +
        "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    setIsReady(true);
  }, []);

  return (
    <SupabaseContext.Provider value={{ isReady }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export default SupabaseProvider;

