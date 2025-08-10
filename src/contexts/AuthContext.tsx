import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, phone?: string, referredBy?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateWalletBalance: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setAuthUser(session.user);
          // Do not block UI on profile fetch
          fetchUserProfile(session.user.id).catch((err) => {
            console.error('Error in fetchUserProfile (init):', err);
          });
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        // Always unlock UI; profile fetching continues in background
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (session?.user) {
          setAuthUser(session.user);
          // Non-blocking profile fetch
          fetchUserProfile(session.user.id).catch((err) => {
            console.error('Error in fetchUserProfile (auth change):', err);
          });
        } else {
          setAuthUser(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        // Ensure UI is not locked by auth changes
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        const userProfile: User = {
          id: data.id,
          email: data.email,
          phone: data.phone || undefined,
          walletBalance: data.wallet_balance || 0,
          referralCode: data.referral_code || '',
          referredBy: data.referred_by || undefined,
          role: data.role || 'user',
          virtualAccountBankName: data.virtual_account_bank_name || undefined,
          virtualAccountNumber: data.virtual_account_number || undefined,
          virtualAccountReference: data.virtual_account_reference || undefined,
          bvn: data.bvn || undefined,
          createdAt: data.created_at,
          firstName: data.first_name || undefined,
          lastName: data.last_name || undefined,
        };
        setUser(userProfile);
        setIsAdmin(data.role === 'admin');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.user) {
        setAuthUser(data.user);
        await fetchUserProfile(data.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // First try regular login
      const loginSuccess = await login(email, password);
      if (!loginSuccess) return false;

      // Check if user is admin after profile is fetched
      // We need to wait a bit for the profile to be fetched
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (user?.role === 'admin') {
        setIsAdmin(true);
        return true;
      }

      // If not admin, logout
      await logout();
      return false;
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, phone?: string, referredBy?: string): Promise<boolean> => {
    try {
      
      // Check if referral code exists if provided
      let referrerUser = null;
      if (referredBy) {
        const { data: referrer, error: referrerError } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referredBy.toUpperCase())
          .single();
        
        if (referrerError || !referrer) {
          console.error('Invalid referral code');
          return false;
        }
        referrerUser = referrer;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone: phone || null,
            referral_code: generateReferralCode(),
            referred_by: referrerUser?.id || null,
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      if (data.user) {
        setAuthUser(data.user);
        // Profile will be created by the trigger, so we wait and then fetch it
        setTimeout(async () => {
          await fetchUserProfile(data.user.id);
        }, 1000);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Optimistic local sign-out to avoid app-wide loading lock
      setUser(null);
      setAuthUser(null);
      setIsAdmin(false);

      // Fire-and-forget remote sign out; don't gate UI on this
      supabase.auth.signOut().catch((error) => {
        console.error('Logout error:', error);
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Ensure global loading overlay is not active after logout
      setLoading(false);
    }
  };

  const updateWalletBalance = async (amount: number): Promise<void> => {
    if (!user) return;

    try {
      const newBalance = user.walletBalance + amount;
      
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating wallet balance:', error);
        return;
      }

      // Update local state
      setUser({ ...user, walletBalance: newBalance });
    } catch (error) {
      console.error('Error updating wallet balance:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      authUser,
      isAdmin,
      loading,
      login,
      adminLogin,
      register,
      logout,
      updateWalletBalance,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get all users (for admin use)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }

    return data.map(profile => ({
      id: profile.id,
      email: profile.email,
      phone: profile.phone || undefined,
      walletBalance: profile.wallet_balance || 0,
      referralCode: profile.referral_code || '',
      referredBy: profile.referred_by || undefined,
      role: profile.role || 'user',
      createdAt: profile.created_at,
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};