// Session management utilities
import { supabase } from './supabase';

class SessionManager {
  private sessionTimer: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private readonly SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

  startSessionMonitor(onExpire: () => void) {
    this.lastActivityTime = Date.now();
    
    // Clear any existing timer
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    // Start monitoring session
    this.sessionTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivityTime;
      
      if (timeSinceActivity >= this.SESSION_DURATION) {
        console.log('Session expired due to inactivity');
        this.clearSession();
        onExpire();
      }
    }, this.CHECK_INTERVAL);

    // Track user activity
    this.setupActivityTracking();
  }

  private setupActivityTracking() {
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    // Track various user activities
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);
  }

  async clearSession() {
    console.log('Clearing session...');
    
    // Stop monitoring
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }

    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    // Clear all auth-related storage
    const keysToRemove: string[] = [];
    
    // Clear localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('starnetx'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }

  stopSessionMonitor() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  resetActivityTimer() {
    this.lastActivityTime = Date.now();
  }

  getTimeUntilExpiry(): number {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    const timeRemaining = this.SESSION_DURATION - timeSinceActivity;
    return Math.max(0, timeRemaining);
  }

  getFormattedTimeRemaining(): string {
    const ms = this.getTimeUntilExpiry();
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export const sessionManager = new SessionManager();