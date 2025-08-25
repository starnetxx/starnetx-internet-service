import { supabase } from './supabase';

export async function debugAdminDataLoading() {
  console.log('=== DEBUG ADMIN DATA LOADING ===');
  
  try {
    // Check credentials
    const { data: credentials, error: credError, count: credCount } = await supabase
      .from('credential_pools')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    console.log('Credentials:', {
      totalCount: credCount,
      fetchedCount: credentials?.length || 0,
      error: credError,
      sample: credentials?.slice(0, 3)
    });

    // Check transactions/purchases
    const { data: purchases, error: purchError, count: purchCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'plan_purchase')
      .order('created_at', { ascending: false });
    
    console.log('Purchases:', {
      totalCount: purchCount,
      fetchedCount: purchases?.length || 0,
      error: purchError,
      sample: purchases?.slice(0, 3)
    });

    // Check all transactions
    const { data: transactions, error: transError, count: transCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    console.log('All Transactions:', {
      totalCount: transCount,
      fetchedCount: transactions?.length || 0,
      error: transError,
      types: [...new Set(transactions?.map(t => t.type) || [])]
    });

    // Check notifications
    const { data: notifications, error: notifError, count: notifCount } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    console.log('Notifications:', {
      totalCount: notifCount,
      fetchedCount: notifications?.length || 0,
      error: notifError,
      sample: notifications?.slice(0, 3)
    });

    // Check plans (including custom)
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });
    
    console.log('Plans:', {
      fetchedCount: plans?.length || 0,
      error: plansError,
      types: [...new Set(plans?.map(p => p.type) || [])],
      customPlans: plans?.filter(p => p.type === 'custom').map(p => ({ id: p.id, name: p.name, type: p.type }))
    });

    // Check for any RLS (Row Level Security) issues
    const { data: session } = await supabase.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session?.session,
      userId: session?.session?.user?.id,
      role: session?.session?.user?.role
    });

  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Call this function from your admin component or browser console
if (typeof window !== 'undefined') {
  (window as any).debugAdminData = debugAdminDataLoading;
}