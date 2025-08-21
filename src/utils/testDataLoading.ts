import { supabase } from './supabase';

/**
 * Test data loading performance and reliability
 */
export const testDataLoading = {
  /**
   * Test how fast the app loads after refresh
   */
  async testLoadingSpeed() {
    console.log('\n=== Testing Loading Speed ===');
    const startTime = performance.now();
    
    // Check auth session
    const { data: { session } } = await supabase.auth.getSession();
    const authTime = performance.now() - startTime;
    
    console.log(`✅ Auth check completed in ${authTime.toFixed(0)}ms`);
    
    if (session) {
      // Test loading plans
      const plansStart = performance.now();
      const { data: plans } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true);
      const plansTime = performance.now() - plansStart;
      
      console.log(`✅ Plans loaded in ${plansTime.toFixed(0)}ms (${plans?.length || 0} plans)`);
      
      // Test loading user data
      const userDataStart = performance.now();
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(10);
      const userDataTime = performance.now() - userDataStart;
      
      console.log(`✅ User transactions loaded in ${userDataTime.toFixed(0)}ms (${transactions?.length || 0} transactions)`);
      
      const totalTime = performance.now() - startTime;
      console.log(`\n📊 Total loading time: ${totalTime.toFixed(0)}ms`);
      
      if (totalTime < 1000) {
        console.log('🚀 Excellent! Loading under 1 second');
      } else if (totalTime < 2000) {
        console.log('✅ Good! Loading under 2 seconds');
      } else if (totalTime < 3000) {
        console.log('⚠️ Acceptable, but could be faster');
      } else {
        console.log('❌ Too slow! Loading over 3 seconds');
      }
      
      return {
        authTime,
        plansTime,
        userDataTime,
        totalTime,
        status: totalTime < 2000 ? 'fast' : 'slow'
      };
    } else {
      console.log('No session - user not logged in');
      return {
        authTime,
        totalTime: authTime,
        status: 'no-session'
      };
    }
  },

  /**
   * Check if data contexts are loading properly
   */
  async checkDataContexts() {
    console.log('\n=== Checking Data Contexts ===');
    
    // Check localStorage for any stuck states
    const localStorageKeys = Object.keys(localStorage);
    const dataKeys = localStorageKeys.filter(key => 
      key.includes('data') || key.includes('loading')
    );
    
    if (dataKeys.length > 0) {
      console.log('Found data-related keys in localStorage:', dataKeys);
    }
    
    // Check if Supabase connection is healthy
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('❌ Supabase connection error:', error);
        return false;
      }
      
      console.log('✅ Supabase connection healthy');
      return true;
    } catch (error) {
      console.log('❌ Failed to connect to Supabase:', error);
      return false;
    }
  },

  /**
   * Test parallel data loading
   */
  async testParallelLoading() {
    console.log('\n=== Testing Parallel Data Loading ===');
    const startTime = performance.now();
    
    try {
      // Load multiple data types in parallel
      const [plans, locations, session] = await Promise.all([
        supabase.from('plans').select('*').eq('is_active', true),
        supabase.from('locations').select('*').eq('is_active', true),
        supabase.auth.getSession()
      ]);
      
      const loadTime = performance.now() - startTime;
      
      console.log(`✅ Parallel loading completed in ${loadTime.toFixed(0)}ms`);
      console.log(`   - Plans: ${plans.data?.length || 0} items`);
      console.log(`   - Locations: ${locations.data?.length || 0} items`);
      console.log(`   - Session: ${session.data.session ? 'Active' : 'None'}`);
      
      if (loadTime < 500) {
        console.log('🚀 Excellent parallel loading performance!');
      } else if (loadTime < 1000) {
        console.log('✅ Good parallel loading performance');
      } else {
        console.log('⚠️ Parallel loading could be optimized');
      }
      
      return {
        loadTime,
        plansCount: plans.data?.length || 0,
        locationsCount: locations.data?.length || 0,
        hasSession: !!session.data.session
      };
    } catch (error) {
      console.error('❌ Parallel loading failed:', error);
      return null;
    }
  },

  /**
   * Run all data loading tests
   */
  async runAll() {
    console.log('🧪 Starting Data Loading Tests...\n');
    
    const results = {
      loadingSpeed: await this.testLoadingSpeed(),
      dataContexts: await this.checkDataContexts(),
      parallelLoading: await this.testParallelLoading()
    };
    
    console.log('\n=== Test Results Summary ===');
    console.log(results);
    
    // Overall assessment
    const avgLoadTime = results.loadingSpeed?.totalTime || 0;
    const parallelTime = results.parallelLoading?.loadTime || 0;
    const overallTime = (avgLoadTime + parallelTime) / 2;
    
    console.log(`\n📊 Average load time: ${overallTime.toFixed(0)}ms`);
    
    if (overallTime < 1000) {
      console.log('🎉 Performance is EXCELLENT!');
    } else if (overallTime < 2000) {
      console.log('✅ Performance is GOOD');
    } else {
      console.log('⚠️ Performance needs improvement');
    }
    
    return results;
  }
};

// Export to window for easy access
if (typeof window !== 'undefined') {
  (window as any).testDataLoading = testDataLoading;
  console.log('Data loading tests available: window.testDataLoading.runAll()');
}