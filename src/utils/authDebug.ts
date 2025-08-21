import { supabase } from './supabase';

/**
 * Debug utility to check authentication state
 */
export const debugAuth = async () => {
  console.log('=== Auth Debug Info ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Check current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
    } else {
      console.log('Current session:', {
        exists: !!session,
        user: session?.user?.email,
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_in,
        tokenType: session?.token_type,
        accessToken: session?.access_token ? 'Present' : 'Missing',
        refreshToken: session?.refresh_token ? 'Present' : 'Missing',
      });
    }
    
    // Check localStorage for Supabase keys
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase')
    );
    console.log('Supabase localStorage keys:', localStorageKeys);
    
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`${key}:`, {
            hasSession: !!parsed.session,
            hasUser: !!parsed.session?.user,
            expiresAt: parsed.session?.expires_at,
          });
        } catch {
          console.log(`${key}: [Non-JSON value]`);
        }
      }
    });
    
    // Check if session is expired
    if (session) {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiryDate = new Date(expiresAt * 1000);
        const now = new Date();
        const isExpired = expiryDate < now;
        console.log('Session expiry:', {
          expiresAt: expiryDate.toISOString(),
          now: now.toISOString(),
          isExpired,
          timeUntilExpiry: isExpired ? 'Expired' : `${Math.floor((expiryDate.getTime() - now.getTime()) / 1000 / 60)} minutes`
        });
      }
    }
    
    // Test Supabase connection
    console.log('Testing Supabase connection...');
    const startTime = Date.now();
    try {
      const { data, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      const endTime = Date.now();
      
      if (testError) {
        console.error('Connection test failed:', testError);
      } else {
        console.log(`Connection test passed in ${endTime - startTime}ms`);
      }
    } catch (connError) {
      console.error('Connection test error:', connError);
    }
    
  } catch (error) {
    console.error('Debug auth error:', error);
  }
  
  console.log('=== End Auth Debug ===');
};

/**
 * Clear all auth-related data from localStorage
 * WARNING: This will log out the user
 */
export const clearAuthData = () => {
  console.warn('Clearing all auth data from localStorage...');
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.includes('supabase')
  );
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Removed: ${key}`);
  });
  console.log('Auth data cleared. Page will reload...');
  window.location.reload();
};

/**
 * Force refresh the current session
 */
export const forceRefreshSession = async () => {
  console.log('Force refreshing session...');
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
    console.log('Session refreshed successfully:', {
      user: data.session?.user?.email,
      expiresAt: data.session?.expires_at,
    });
    return true;
  } catch (error) {
    console.error('Session refresh error:', error);
    return false;
  }
};

/**
 * Check if there's a session mismatch between localStorage and Supabase
 */
export const checkSessionMismatch = async () => {
  console.log('Checking for session mismatch...');
  
  // Get session from Supabase
  const { data: { session: supabaseSession } } = await supabase.auth.getSession();
  
  // Get session from localStorage
  let localStorageSession = null;
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') && key.includes('auth-token')
  );
  
  if (localStorageKeys.length > 0) {
    const value = localStorage.getItem(localStorageKeys[0]);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        localStorageSession = parsed.session;
      } catch {
        console.error('Failed to parse localStorage session');
      }
    }
  }
  
  const mismatch = {
    supabaseHasSession: !!supabaseSession,
    localStorageHasSession: !!localStorageSession,
    match: !!supabaseSession === !!localStorageSession,
  };
  
  if (!mismatch.match) {
    console.warn('Session mismatch detected!', mismatch);
    if (localStorageSession && !supabaseSession) {
      console.warn('localStorage has session but Supabase does not - this is the stuck auth issue!');
      console.log('Try running clearAuthData() to fix this');
    }
  } else {
    console.log('Sessions match:', mismatch);
  }
  
  return mismatch;
};

// Export to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    debug: debugAuth,
    clear: clearAuthData,
    refresh: forceRefreshSession,
    checkMismatch: checkSessionMismatch,
  };
  console.log('Auth debug utilities available: window.authDebug.debug(), .clear(), .refresh(), .checkMismatch()');
}