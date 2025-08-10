import { supabase } from './supabase';

export interface CreateVirtualAccountData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  bvn: string; // Now required
}

export interface VirtualAccountResponse {
  status: string;
  message: string;
  data?: {
    id: string;
    amount: number;
    account_number: string;
    reference: string;
    account_bank_name: string;
    account_type: string;
    status: string;
    currency: string;
    customer_id: string;
    created_datetime: string;
    account_expiration_datetime?: string;
    note?: string;
    meta?: any;
  };
  error?: string;
}

export const createVirtualAccount = async (data: CreateVirtualAccountData): Promise<VirtualAccountResponse> => {
  try {
    const { data: response, error } = await supabase.functions.invoke('create-virtual-account', {
      body: {
        ...data,
        currency: 'NGN',
        account_type: 'static',
        amount: 1000, // Default amount for account creation
        reference: `starnetx-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      // Surface friendlier errors if possible
      const friendly = /bvn/i.test(error.message || '') ? 'Invalid BVN' : (error.message || 'Failed to create virtual account');
      return {
        status: 'error',
        message: friendly,
        error: friendly
      };
    }

    return response;
  } catch (error) {
    console.error('Error creating virtual account:', error);
    return {
      status: 'error',
      message: 'Network error. Please try again.',
      error: 'Network error. Please try again.'
    };
  }
};

export const getUserVirtualAccount = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('virtual_account_bank_name, virtual_account_number, virtual_account_reference')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching virtual account:', error);
      return null;
    }

    if (data.virtual_account_number && data.virtual_account_bank_name) {
      return {
        bankName: data.virtual_account_bank_name,
        accountNumber: data.virtual_account_number,
        reference: data.virtual_account_reference
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting virtual account:', error);
    return null;
  }
};
