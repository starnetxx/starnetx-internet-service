import { supabase } from './supabase';

/**
 * Debug data loading issues
 */
export const debugDataLoading = {
  /**
   * Check what's happening with data loading
   */
  async checkDataState() {
    console.log('=== Data Loading Debug ===');
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    console.log('1. User authenticated:', !!session?.user);
    
    if (session?.user) {
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
    }
    
    // Try to load plans directly
    console.log('\n2. Testing direct data load...');
    try {
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .limit(5);
      
      if (plansError) {
        console.error('❌ Error loading plans:', plansError);
      } else {
        console.log(`✅ Loaded ${plans?.length || 0} plans directly`);
      }
    } catch (error) {
      console.error('❌ Failed to load plans:', error);
    }
    
    // Try to load user transactions if authenticated
    if (session?.user) {
      try {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .limit(5);
        
        if (txError) {
          console.error('❌ Error loading transactions:', txError);
        } else {
          console.log(`✅ Loaded ${transactions?.length || 0} transactions directly`);
        }
      } catch (error) {
        console.error('❌ Failed to load transactions:', error);
      }
    }
    
    // Check localStorage for any stuck flags
    console.log('\n3. Checking for stuck flags...');
    const keys = Object.keys(localStorage);
    const relevantKeys = keys.filter(k => 
      k.includes('loading') || k.includes('initial') || k.includes('data')
    );
    
    if (relevantKeys.length > 0) {
      console.log('Found potentially relevant keys:', relevantKeys);
    } else {
      console.log('No stuck flags in localStorage');
    }
    
    console.log('\n=== Recommendations ===');
    console.log('1. Check console for any error messages above');
    console.log('2. If data loads directly but not in app, it\'s a React state issue');
    console.log('3. Try hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)');
    console.log('4. Check Network tab for failed requests');
    
    return {
      authenticated: !!session?.user,
      canLoadData: true // Will be false if direct loads fail
    };
  },

  /**
   * Force reload all data
   */
  async forceReloadData() {
    console.log('Force reloading all data...');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('❌ No user session, cannot load user data');
      return;
    }
    
    try {
      // Load everything in parallel
      const [plans, locations, transactions] = await Promise.all([
        supabase.from('plans').select('*').eq('is_active', true),
        supabase.from('locations').select('*').eq('is_active', true),
        supabase.from('transactions').select('*').eq('user_id', session.user.id).limit(10)
      ]);
      
      console.log('✅ Data loaded successfully:');
      console.log(`   - Plans: ${plans.data?.length || 0}`);
      console.log(`   - Locations: ${locations.data?.length || 0}`);
      console.log(`   - Transactions: ${transactions.data?.length || 0}`);
      
      console.log('\nIf data loads here but not in app, the issue is in React state management');
      console.log('Try refreshing the page or clearing cache');
      
      return {
        plans: plans.data?.length || 0,
        locations: locations.data?.length || 0,
        transactions: transactions.data?.length || 0
      };
    } catch (error) {
      console.error('❌ Error force reloading data:', error);
      return null;
    }
  },

  /**
   * Check React component states (requires React DevTools)
   */
  checkReactState() {
    console.log('=== React State Check ===');
    console.log('1. Open React DevTools');
    console.log('2. Find DataProvider component');
    console.log('3. Check these state values:');
    console.log('   - loading (should be false)');
    console.log('   - initialLoadStarted (should be true)');
    console.log('   - plans (should have data)');
    console.log('   - transactions (should have data if logged in)');
    console.log('4. If loading is stuck on true, that\'s the issue');
  }
};

// Export to window
if (typeof window !== 'undefined') {
  (window as any).debugDataLoading = debugDataLoading;
  console.log('Data loading debug available: window.debugDataLoading.checkDataState()');
}