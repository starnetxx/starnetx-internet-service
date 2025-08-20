import { supabase } from './supabase';

/**
 * Test authentication flow scenarios
 */
export const testAuthFlow = {
  /**
   * Test 1: Check if session persists after page refresh
   */
  async testSessionPersistence() {
    console.log('\n=== Test 1: Session Persistence ===');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ Session exists:', {
        user: session.user.email,
        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
      });
      
      // Check localStorage
      const hasLocalStorage = Object.keys(localStorage).some(key => 
        key.includes('supabase') && localStorage.getItem(key)?.includes('session')
      );
      
      if (hasLocalStorage) {
        console.log('✅ Session is in localStorage');
      } else {
        console.log('❌ Session NOT in localStorage - this will cause issues!');
      }
      
      return true;
    } else {
      console.log('❌ No session found');
      return false;
    }
  },

  /**
   * Test 2: Test login flow
   */
  async testLogin(email: string, password: string) {
    console.log('\n=== Test 2: Login Flow ===');
    
    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.log('❌ Login failed:', error.message);
        return false;
      }
      
      if (data.session) {
        console.log('✅ Login successful:', {
          user: data.user.email,
          sessionExists: !!data.session,
        });
        
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if session is persisted
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Session persisted after login');
        } else {
          console.log('❌ Session NOT persisted after login');
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('❌ Login error:', error);
      return false;
    }
  },

  /**
   * Test 3: Test logout flow
   */
  async testLogout() {
    console.log('\n=== Test 3: Logout Flow ===');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.log('❌ Logout failed:', error.message);
        return false;
      }
      
      console.log('✅ Logout successful');
      
      // Check if session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('✅ Session cleared after logout');
      } else {
        console.log('❌ Session still exists after logout!');
      }
      
      // Check localStorage
      const hasAuthData = Object.keys(localStorage).some(key => 
        key.includes('supabase') && localStorage.getItem(key)?.includes('session')
      );
      
      if (!hasAuthData) {
        console.log('✅ localStorage cleared');
      } else {
        console.log('⚠️ Some auth data still in localStorage');
      }
      
      return true;
    } catch (error) {
      console.log('❌ Logout error:', error);
      return false;
    }
  },

  /**
   * Test 4: Test session refresh
   */
  async testSessionRefresh() {
    console.log('\n=== Test 4: Session Refresh ===');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.log('❌ Session refresh failed:', error.message);
        return false;
      }
      
      if (data.session) {
        console.log('✅ Session refreshed:', {
          user: data.user?.email,
          newExpiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
        });
        return true;
      } else {
        console.log('❌ No session to refresh');
        return false;
      }
    } catch (error) {
      console.log('❌ Refresh error:', error);
      return false;
    }
  },

  /**
   * Test 5: Simulate page refresh
   */
  async testPageRefresh() {
    console.log('\n=== Test 5: Page Refresh Simulation ===');
    
    const beforeSession = await supabase.auth.getSession();
    console.log('Before refresh:', {
      hasSession: !!beforeSession.data.session,
      user: beforeSession.data.session?.user.email,
    });
    
    // Clear Supabase client state (simulating page refresh)
    console.log('Simulating page refresh...');
    
    // Re-check session (this is what happens on page load)
    const afterSession = await supabase.auth.getSession();
    console.log('After refresh:', {
      hasSession: !!afterSession.data.session,
      user: afterSession.data.session?.user.email,
    });
    
    if (beforeSession.data.session && afterSession.data.session) {
      console.log('✅ Session persisted through refresh');
      return true;
    } else if (!beforeSession.data.session && !afterSession.data.session) {
      console.log('✅ No session before or after (expected)');
      return true;
    } else {
      console.log('❌ Session state changed unexpectedly');
      return false;
    }
  },

  /**
   * Run all tests
   */
  async runAll(email?: string, password?: string) {
    console.log('🧪 Starting Auth Flow Tests...\n');
    
    const results = {
      sessionPersistence: await this.testSessionPersistence(),
      pageRefresh: await this.testPageRefresh(),
      sessionRefresh: await this.testSessionRefresh(),
      logout: false,
      login: false,
    };
    
    // Only run login/logout tests if credentials provided
    if (email && password) {
      results.logout = await this.testLogout();
      results.login = await this.testLogin(email, password);
    } else {
      console.log('\n⚠️ Skipping login/logout tests (no credentials provided)');
    }
    
    console.log('\n=== Test Results ===');
    console.log(results);
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.values(results).length;
    console.log(`\n${passed}/${total} tests passed`);
    
    return results;
  },
};

// Export to window for easy access
if (typeof window !== 'undefined') {
  (window as any).testAuth = testAuthFlow;
  console.log('Auth tests available: window.testAuth.runAll(email?, password?)');
}