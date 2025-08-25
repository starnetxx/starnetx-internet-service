import { supabase } from './supabase';

/**
 * Test RLS policies and data access
 * Run this in browser console: window.testRLS()
 */
export async function testRLS() {
  console.log('🔍 Testing RLS and Data Access...\n');
  
  try {
    // 1. Check current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ Not logged in!');
      return;
    }
    
    console.log('✅ Logged in as:', session.user.email);
    console.log('User ID:', session.user.id);
    
    // 2. Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else {
      console.log('User Role:', profile?.role || 'NOT SET');
      if (profile?.role !== 'admin') {
        console.warn('⚠️ User is NOT an admin! This is likely the issue.');
        console.log('To fix: Run this SQL in Supabase:');
        console.log(`UPDATE profiles SET role = 'admin' WHERE id = '${session.user.id}';`);
      } else {
        console.log('✅ User is admin');
      }
    }
    
    console.log('\n📊 Checking data access with RLS:\n');
    
    // 3. Test each table
    const tables = [
      'credential_pools',
      'transactions',
      'admin_notifications',
      'profiles',
      'plans',
      'locations'
    ];
    
    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ ${table}: ERROR -`, error.message);
      } else {
        console.log(`📁 ${table}: ${count || 0} records accessible`);
      }
    }
    
    // 4. Try to fetch without RLS (using service role - won't work from browser)
    console.log('\n🔐 RLS Policy Test:\n');
    
    // Test specific queries
    const { data: creds, error: credsError } = await supabase
      .from('credential_pools')
      .select('id, username, status')
      .limit(5);
    
    if (credsError) {
      console.error('Cannot fetch credentials:', credsError.message);
      console.log('This suggests RLS is blocking access');
    } else {
      console.log(`Found ${creds?.length || 0} credentials (showing max 5)`);
      creds?.forEach(c => console.log(`  - ${c.username} (${c.status})`));
    }
    
    // 5. Test with RPC function (bypasses RLS if function has SECURITY DEFINER)
    console.log('\n💡 Suggested fixes:\n');
    console.log('1. Update your user role to admin in Supabase:');
    console.log(`   UPDATE profiles SET role = 'admin' WHERE email = '${session.user.email}';`);
    console.log('\n2. Or temporarily disable RLS (NOT for production):');
    console.log('   ALTER TABLE credential_pools DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');
    console.log('\n3. Or use the SQL scripts in /supabase folder to fix policies');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Make it available in browser console
if (typeof window !== 'undefined') {
  (window as any).testRLS = testRLS;
}