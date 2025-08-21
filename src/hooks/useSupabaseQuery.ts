import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

type QueryFunction<T> = (userId: string) => Promise<{ data: T | null; error: any }>;

interface UseSupabaseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: any;
  refetch: () => void;
}

/**
 * Custom hook for fetching data from Supabase with proper auth handling
 * @param queryFn - Function that performs the Supabase query
 * @param dependencies - Additional dependencies to trigger refetch
 * @param enabled - Whether to run the query (default: true)
 */
export function useSupabaseQuery<T>(
  queryFn: QueryFunction<T>,
  dependencies: any[] = [],
  enabled: boolean = true
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { user, authUser, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    // Don't fetch if auth is still loading or no user
    if (authLoading || !authUser || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[useSupabaseQuery] Fetching data for user: ${authUser.id}`);
      const result = await queryFn(authUser.id);
      
      if (result.error) {
        console.error('[useSupabaseQuery] Query error:', result.error);
        setError(result.error);
        setData(null);
      } else {
        console.log('[useSupabaseQuery] Query success:', result.data);
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      console.error('[useSupabaseQuery] Unexpected error:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [authUser, authLoading, queryFn, enabled]);

  useEffect(() => {
    let mounted = true;

    const runQuery = async () => {
      if (!mounted) return;
      await fetchData();
    };

    runQuery();

    return () => {
      mounted = false;
    };
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    if (authUser && !authLoading) {
      fetchData();
    }
  }, [authUser, authLoading, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook for fetching user profile/balance data
 */
export function useUserBalance() {
  const queryFn = async (userId: string) => {
    return await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();
  };

  return useSupabaseQuery(queryFn);
}

/**
 * Hook for fetching user's recent purchases
 */
export function useRecentPurchases(limit: number = 10) {
  const queryFn = async (userId: string) => {
    return await supabase
      .from('transactions')
      .select(`
        *,
        plans(name, duration, price),
        locations(name)
      `)
      .eq('user_id', userId)
      .eq('type', 'plan_purchase')
      .order('created_at', { ascending: false })
      .limit(limit);
  };

  return useSupabaseQuery(queryFn, [limit]);
}

/**
 * Hook for fetching available plans
 */
export function useAvailablePlans() {
  const queryFn = async () => {
    return await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });
  };

  // Plans don't require user ID, so we pass empty string
  return useSupabaseQuery(() => queryFn(), []);
}

/**
 * Hook for fetching user's transaction history
 */
export function useTransactionHistory(limit: number = 20) {
  const queryFn = async (userId: string) => {
    return await supabase
      .from('transactions')
      .select(`
        *,
        plans(name, duration),
        locations(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  };

  return useSupabaseQuery(queryFn, [limit]);
}

/**
 * Hook for fetching user's active plans
 */
export function useUserPlans() {
  const queryFn = async (userId: string) => {
    return await supabase
      .from('transactions')
      .select(`
        *,
        plans(name, duration, price, data_amount),
        locations(name)
      `)
      .eq('user_id', userId)
      .eq('type', 'plan_purchase')
      .eq('status', 'active')
      .order('expires_at', { ascending: false });
  };

  return useSupabaseQuery(queryFn);
}