import { supabase } from './supabase';

/**
 * Debug utility for Supabase data fetching issues
 */
export const supabaseDataDebug = {
  /**
   * Test all data tables and RLS policies
   */
  async testDataAccess() {
    console.log('=== Supabase Data Access Debug ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.error('❌ No active session - user must be logged in');
      return;
    }
    
    console.log('✅ Active session found');
    console.log('User ID:', session.user.id);
    console.log('Email:', session.user.email);
    
    // Test each table
    const tables = [
      { name: 'profiles', query: () => supabase.from('profiles').select('*').eq('id', session.user.id).single() },
      { name: 'plans', query: () => supabase.from('plans').select('*').eq('is_active', true) },
      { name: 'transactions', query: () => supabase.from('transactions').select('*').eq('user_id', session.user.id).limit(5) },
      { name: 'locations', query: () => supabase.from('locations').select('*').eq('is_active', true) },
    ];
    
    console.log('\n=== Testing Table Access ===');
    
    for (const table of tables) {
      try {
        console.log(`\nTesting ${table.name}...`);
        const { data, error } = await table.query();
        
        if (error) {
          console.error(`❌ ${table.name} error:`, error);
          
          // Check specific error codes
          if (error.code === 'PGRST116') {
            console.error('  → RLS policy issue: User lacks SELECT permission');
          } else if (error.code === '42P01') {
            console.error('  → Table does not exist');
          } else if (error.code === 'PGRST301') {
            console.error('  → No rows found (might be normal)');
          }
        } else {
          const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
          console.log(`✅ ${table.name}: Success (${count} records)`);
          
          // Show sample data structure
          if (data && (Array.isArray(data) ? data[0] : data)) {
            const sample = Array.isArray(data) ? data[0] : data;
            console.log('  Sample fields:', Object.keys(sample).join(', '));
          }
        }
      } catch (err) {
        console.error(`❌ ${table.name} unexpected error:`, err);
      }
    }
    
    console.log('\n=== RLS Policy Recommendations ===');
    console.log('If you see PGRST116 errors, add these policies in Supabase:');
    console.log(`
-- For profiles table
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- For transactions table  
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- For plans table (public read)
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true);

-- For locations table (public read)
CREATE POLICY "Anyone can view active locations" ON locations
  FOR SELECT USING (is_active = true);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
    `);
  },

  /**
   * Test specific query
   */
  async testQuery(tableName: string, query: any) {
    console.log(`\n=== Testing Custom Query on ${tableName} ===`);
    
    try {
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Query error:', error);
        return null;
      }
      
      console.log('✅ Query successful');
      console.log('Data:', data);
      return data;
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return null;
    }
  },

  /**
   * Check if user has required data
   */
  async checkUserData() {
    console.log('\n=== Checking User Data Completeness ===');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ No session');
      return;
    }
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
    } else {
      console.log('✅ Profile exists');
      console.log('  - Wallet balance:', profile.wallet_balance);
      console.log('  - Referral code:', profile.referral_code);
      console.log('  - Role:', profile.role);
    }
    
    // Check transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('count')
      .eq('user_id', session.user.id);
    
    if (txError) {
      console.error('❌ Transactions error:', txError);
    } else {
      console.log(`✅ Transactions: ${transactions?.[0]?.count || 0} total`);
    }
    
    // Check active plans
    const { data: activePlans, error: plansError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('type', 'plan_purchase')
      .eq('status', 'active');
    
    if (plansError) {
      console.error('❌ Active plans error:', plansError);
    } else {
      console.log(`✅ Active plans: ${activePlans?.length || 0}`);
    }
  },

  /**
   * Fix common issues
   */
  async suggestFixes() {
    console.log('\n=== Common Fixes ===');
    console.log('1. If no data shows after login:');
    console.log('   - Check RLS policies (run testDataAccess)');
    console.log('   - Verify user_id columns match auth.uid()');
    console.log('   - Check if profile exists for user');
    console.log('\n2. If data loads slowly:');
    console.log('   - Add database indexes on user_id columns');
    console.log('   - Limit query results with .limit()');
    console.log('   - Use select() to fetch only needed columns');
    console.log('\n3. If getting permission errors:');
    console.log('   - Enable RLS on tables');
    console.log('   - Add appropriate policies');
    console.log('   - Check if using correct auth.uid()');
  }
};

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).supabaseDebug = supabaseDataDebug;
  console.log('Supabase data debug available: window.supabaseDebug.testDataAccess()');
}