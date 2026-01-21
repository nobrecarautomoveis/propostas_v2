/**
 * Cliente Supabase para uso no servidor (server-side)
 * Inclui suporte para cookies em Server Components e Route Handlers
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria um cliente Supabase para uso em Server Components
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Cookies não podem ser modificados em Server Components
          // Isso é esperado quando usado em Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Cookies não podem ser modificados em Server Components
        }
      },
    },
  });
}

/**
 * Cria um cliente Supabase para uso em Route Handlers (API Routes)
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

/**
 * Cria um cliente Supabase com Service Role para operações administrativas
 * ATENÇÃO: Use apenas em server-side, nunca exponha a Service Role Key no cliente
 */
export function createAdminClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  }

  return createServerClient<Database>(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get() { return undefined; },
      set() {},
      remove() {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

