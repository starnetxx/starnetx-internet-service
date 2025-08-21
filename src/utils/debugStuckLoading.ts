/**
 * Debug helper for when app is stuck on loading screen
 */
export const debugStuckLoading = async () => {
  console.log('=== Debugging Stuck Loading Issue ===');
  
  // Check React state (this won't work directly, but we can check localStorage and Supabase)
  const { supabase } = await import('./supabase');
  
  // Check Supabase session
  console.log('1. Checking Supabase session...');
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Error getting session:', error);
  } else if (session) {
    console.log('✅ Session exists:', {
      user: session.user.email,
      id: session.user.id,
      expiresAt: new Date(session.expires_at! * 1000).toISOString()
    });
  } else {
    console.log('❌ No session found');
  }
  
  // Check localStorage
  console.log('\n2. Checking localStorage...');
  const authKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(value || '{}');
      if (parsed.session) {
        console.log(`✅ Found session in ${key}`);
      } else {
        console.log(`❌ No session in ${key}`);
      }
    } catch {
      console.log(`⚠️ Non-JSON value in ${key}`);
    }
  });
  
  // Check if there's a mismatch
  console.log('\n3. Checking for mismatches...');
  const hasLocalSession = authKeys.some(key => {
    const value = localStorage.getItem(key);
    return value && value.includes('"session"') && value.includes('"user"');
  });
  
  if (hasLocalSession && !session) {
    console.error('❌ MISMATCH: localStorage has session but Supabase does not!');
    console.log('Fix: Run window.authDebug.clear() to clear localStorage and reload');
  } else if (!hasLocalSession && session) {
    console.error('❌ MISMATCH: Supabase has session but localStorage does not!');
    console.log('Fix: Try refreshing the page');
  } else if (hasLocalSession && session) {
    console.log('✅ Both localStorage and Supabase have session');
    console.log('The issue might be in React state management');
    console.log('Try: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
  } else {
    console.log('✅ No session in either place - user needs to login');
  }
  
  console.log('\n=== Quick Fixes to Try ===');
  console.log('1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)');
  console.log('2. Clear auth data: window.authDebug.clear()');
  console.log('3. Force refresh session: window.authDebug.refresh()');
  console.log('4. Check console for errors above');
  
  return {
    hasSupabaseSession: !!session,
    hasLocalStorageSession: hasLocalSession,
    mismatch: hasLocalSession !== !!session
  };
};

// Export to window
if (typeof window !== 'undefined') {
  (window as any).debugStuckLoading = debugStuckLoading;
  console.log('Debug helper available: window.debugStuckLoading()');
}