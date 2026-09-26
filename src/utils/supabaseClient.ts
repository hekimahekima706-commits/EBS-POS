import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Strictly targeted Supabase tables for EBS system
 */
export const PROFILES_TABLE = 'profiles' as const;
export const BUSINESSES_TABLE = 'businesses' as const;

export const supabaseClient: SupabaseClient<any, any, any> | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Helper to query the strictly targeted profiles table
 */
export function getProfilesTable() {
  if (!supabaseClient) return null;
  return supabaseClient.from(PROFILES_TABLE);
}

/**
 * Helper to query the strictly targeted businesses table
 */
export function getBusinessesTable() {
  if (!supabaseClient) return null;
  return supabaseClient.from(BUSINESSES_TABLE);
}

/**
 * Helper to subscribe to real-time sales and products changes across devices
 */
export function subscribeToPosRealtime(
  businessIdOrCallback?: string | ((table: string, payload: any) => void),
  callbacks?: {
    onProductChange?: (payload: any) => void;
    onSaleChange?: (payload: any) => void;
  }
) {
  if (!supabaseClient) return () => {};

  try {
    const isSingleCallback = typeof businessIdOrCallback === 'function';
    const bId = typeof businessIdOrCallback === 'string' ? businessIdOrCallback : 'global';
    const singleCb = isSingleCallback ? businessIdOrCallback : null;

    const channel = supabaseClient
      .channel(`pos_realtime_${bId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (singleCb) singleCb('products', payload);
          if (callbacks?.onProductChange) callbacks.onProductChange(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          if (singleCb) singleCb('sales', payload);
          if (callbacks?.onSaleChange) callbacks.onSaleChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabaseClient?.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[EBS Realtime] Could not connect to Supabase channel:', err);
    return () => {};
  }
}
