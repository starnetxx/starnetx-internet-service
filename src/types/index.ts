export interface User {
  id: string;
  email: string;
  phone?: string;
  walletBalance: number;
  referralCode: string;
  referredBy?: string;
  role?: 'admin' | 'user';
  virtualAccountBankName?: string;
  virtualAccountNumber?: string;
  virtualAccountReference?: string;
  bvn?: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
}

export interface Plan {
  id: string;
  name: string;
  duration: string; // e.g., "3 Hours", "1 Day", "1 Week"
  durationHours: number;
  price: number;
  dataAmount: string; // e.g., "2 GB", "Unlimited"
  type: '3-hour' | 'daily' | 'weekly' | 'monthly';
  popular: boolean;
  isUnlimited: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  wifiName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  planId?: string;
  locationId?: string;
  credentialId?: string;
  amount: number;
  type: 'wallet_topup' | 'plan_purchase' | 'wallet_funding';
  status: 'pending' | 'completed' | 'failed' | 'success';
  mikrotikUsername?: string;
  mikrotikPassword?: string;
  expiresAt?: string;
  purchaseDate: string;
  activationDate?: string;
  createdAt: string;
  updatedAt: string;
  // Computed properties for backward compatibility
  expiryDate: string;
  mikrotikCredentials: {
    username: string;
    password: string;
  };
}

export interface CredentialPool {
  id: string;
  locationId: string;
  planId: string;
  username: string;
  password: string;
  status: 'available' | 'used' | 'disabled';
  assignedTo?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Legacy interfaces for backward compatibility
export interface Purchase extends Transaction {
  planId: string;
  locationId: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'used' | 'pending';
}

export interface Credential extends CredentialPool {
  planType: '3-hour' | 'daily' | 'weekly' | 'monthly';
  assignedUserId?: string;
  assignedPurchaseId?: string;
  assignedDate?: string;
}