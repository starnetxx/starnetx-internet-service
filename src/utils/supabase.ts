import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist session in storage
    autoRefreshToken: false, // Don't auto-refresh tokens
    detectSessionInUrl: true,
    storageKey: 'starnetx-auth-token',
    storage: {
      // Custom storage that expires after 5 minutes
      getItem: (key: string) => {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        try {
          const data = JSON.parse(item);
          const now = new Date().getTime();
          
          // Check if data has expired (5 minutes = 300000ms)
          if (data.expiry && now > data.expiry) {
            localStorage.removeItem(key);
            return null;
          }
          
          return JSON.stringify(data.value);
        } catch {
          return item;
        }
      },
      setItem: (key: string, value: string) => {
        const now = new Date().getTime();
        const item = {
          value: JSON.parse(value),
          expiry: now + (5 * 60 * 1000), // 5 minutes from now
        };
        localStorage.setItem(key, JSON.stringify(item));
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'starnetx-web-app',
    },
  },
})

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          phone: string | null
          wallet_balance: number
          referral_code: string | null
          referred_by: string | null
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          phone?: string | null
          wallet_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          wallet_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          duration: string
          duration_hours: number
          price: number
          data_amount: string
          type: '3-hour' | 'daily' | 'weekly' | 'monthly'
          popular: boolean
          is_unlimited: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          duration: string
          duration_hours: number
          price: number
          data_amount: string
          type: '3-hour' | 'daily' | 'weekly' | 'monthly'
          popular?: boolean
          is_unlimited?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          duration?: string
          duration_hours?: number
          price?: number
          data_amount?: string
          type?: '3-hour' | 'daily' | 'weekly' | 'monthly'
          popular?: boolean
          is_unlimited?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          wifi_name: string
          username: string
          password: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          wifi_name: string
          username: string
          password: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          wifi_name?: string
          username?: string
          password?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      credential_pools: {
        Row: {
          id: string
          location_id: string
          plan_id: string
          username: string
          password: string
          status: 'available' | 'used' | 'disabled'
          assigned_to: string | null
          assigned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          plan_id: string
          username: string
          password: string
          status?: 'available' | 'used' | 'disabled'
          assigned_to?: string | null
          assigned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          plan_id?: string
          username?: string
          password?: string
          status?: 'available' | 'used' | 'disabled'
          assigned_to?: string | null
          assigned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          location_id: string | null
          credential_id: string | null
          amount: number
          type: 'wallet_topup' | 'plan_purchase' | 'wallet_funding'
          status: 'pending' | 'completed' | 'failed' | 'success'
          reference?: string
          flutterwave_reference?: string
          flutterwave_tx_ref?: string
          payment_method?: string
          details?: any
          metadata?: any
          mikrotik_username: string | null
          mikrotik_password: string | null
          expires_at: string | null
          purchase_date: string | null
          activation_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          location_id?: string | null
          credential_id?: string | null
          amount: number
          type: 'wallet_topup' | 'plan_purchase' | 'wallet_funding'
          status?: 'pending' | 'completed' | 'failed' | 'success'
          reference?: string
          flutterwave_reference?: string
          flutterwave_tx_ref?: string
          payment_method?: string
          details?: any
          metadata?: any
          mikrotik_username?: string | null
          mikrotik_password?: string | null
          expires_at?: string | null
          purchase_date?: string | null
          activation_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          location_id?: string | null
          credential_id?: string | null
          amount?: number
          type?: 'wallet_topup' | 'plan_purchase' | 'wallet_funding'
          status?: 'pending' | 'completed' | 'failed' | 'success'
          reference?: string
          flutterwave_reference?: string
          flutterwave_tx_ref?: string
          payment_method?: string
          details?: any
          metadata?: any
          mikrotik_username?: string | null
          mikrotik_password?: string | null
          expires_at?: string | null
          purchase_date?: string | null
          activation_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}