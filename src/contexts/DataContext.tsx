import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Plan, Location, Transaction, CredentialPool, Purchase, Credential } from '../types';

interface DataContextType {
  plans: Plan[];
  locations: Location[];
  purchases: Purchase[];
  credentials: Credential[];
  loading: boolean;
  userDataLoading: boolean;
  isPurchaseInProgress: boolean;
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlan: (id: string, plan: Partial<Plan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLocation: (id: string, location: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addCredential: (credential: Omit<Credential, 'id' | 'createdAt'>) => Promise<void>;
  bulkAddCredentials: (credentials: Array<Omit<Credential, 'id' | 'createdAt'>>) => Promise<number>;
  updateCredentialStatus: (id: string, status: 'available' | 'used', assignedUserId?: string, assignedPurchaseId?: string) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  getAvailableCredential: (locationId: string, planId: string) => Promise<Credential | null>;
  getCredentialsByLocation: (locationId: string, planId?: string) => Credential[];
  purchasePlan: (planId: string, locationId: string, userId: string) => Promise<Purchase | null>;
  activatePurchase: (purchaseId: string, userId: string) => Promise<Purchase | null>;
  getUserPurchases: (userId: string) => Purchase[];
  getAllPurchases: () => Purchase[];
  getUserTransactions: (userId: string) => any[];
  getAllTransactions: () => any[];
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, set true only when actually loading
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [isPurchaseInProgress, setIsPurchaseInProgress] = useState(false);
  const [initialLoadStarted, setInitialLoadStarted] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // After auth login, reload user-scoped data so UI reflects purchases without manual refresh
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('DataContext: Auth state changed:', event);
      
      // Only reload data on actual sign in, not on initial session or token refresh
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          setUserDataLoading(true);
          console.log('User signed in, reloading user data...');
          // Reload all user data
          await Promise.all([
            loadPurchases(), 
            loadCredentials(),
            loadTransactions()
          ]);
        } catch (e) {
          console.error('Error reloading data after login:', e);
        } finally {
          setUserDataLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // On logout, clear user-scoped data
        console.log('User signed out, clearing data...');
        setPurchases([]);
        setCredentials([]);
        setTransactions([]);
        setUserDataLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadInitialData = async () => {
    // Prevent multiple simultaneous initial loads
    if (initialLoadStarted) {
      console.log('Initial load already started, skipping...');
      return;
    }
    
    setInitialLoadStarted(true);
    
    try {
      setLoading(true);
      console.log('Loading initial data...');
      
      // Load public data first (plans and locations)
      const publicDataPromise = Promise.all([
        loadPlans(),
        loadLocations()
      ]);
      
      // Load user data in parallel if authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('User authenticated, loading all data...');
        // Load everything in parallel for better performance
        await Promise.all([
          publicDataPromise,
          loadPurchases(),
          loadCredentials(),
          loadTransactions()
        ]);
      } else {
        console.log('No user session, loading public data only...');
        await publicDataPromise;
      }
      
      console.log('Initial data load complete');
    } catch (error) {
      console.error('Error loading initial data:', error);
      setLoading(false); // Ensure loading stops even on error
      // Reset the flag on error so it can retry
      setInitialLoadStarted(false);
      
      // Add retry logic for network errors
      if (error instanceof Error && error.message.includes('network')) {
        console.log('Network error detected, retrying in 3 seconds...');
        setTimeout(() => {
          loadInitialData();
        }, 3000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true })
        .order('price', { ascending: true }); // Fallback sorting by price if order is null

      if (error) {
        console.error('Error loading plans:', error);
        // Don't retry here, let the main loadInitialData handle retries
        return;
      }

      const formattedPlans: Plan[] = data.map(plan => ({
        id: plan.id,
        name: plan.name,
        duration: plan.duration || `${plan.duration_hours} Hours`,
        durationHours: plan.duration_hours,
        price: plan.price,
        dataAmount: plan.data_amount || 'Unlimited',
        type: plan.type,
        popular: plan.popular,
        isUnlimited: plan.is_unlimited,
        isActive: plan.is_active,
        order: plan.order || 0, // Default to 0 if order is null
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      // Don't retry here, let the main loadInitialData handle retries
    }
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading locations:', error);
        return;
      }

      const formattedLocations: Location[] = data.map(location => ({
        id: location.id,
        name: location.name,
        wifiName: location.wifi_name,
        isActive: location.is_active,
        createdAt: location.created_at,
        updatedAt: location.updated_at,
      }));

      setLocations(formattedLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'plan_purchase')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading purchases:', error);
        // Don't let this error block the UI
        setPurchases([]);
        return;
      }

      const formattedPurchases: Purchase[] = data.map(transaction => {
        const expiryDate = transaction.expires_at || '';
        const mikrotikCredentials = {
          username: transaction.mikrotik_username || '',
          password: transaction.mikrotik_password || '',
        };

        return {
          id: transaction.id,
          userId: transaction.user_id,
          planId: transaction.plan_id || '',
          locationId: transaction.location_id || '',
          amount: transaction.amount,
          type: transaction.type,
          purchaseDate: transaction.purchase_date || transaction.created_at,
          expiryDate,
          activationDate: transaction.activation_date,
          credentialId: transaction.credential_id,
          mikrotikCredentials,
          mikrotikUsername: transaction.mikrotik_username,
          mikrotikPassword: transaction.mikrotik_password,
          expiresAt: transaction.expires_at,
          status: mapTransactionStatusToPurchaseStatus(transaction.status, expiryDate),
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at,
        };
      });

      setPurchases(formattedPurchases);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        setTransactions([]);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('credential_pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading credentials:', error);
        // Don't let this error block the UI
        setCredentials([]);
        return;
      }

      const formattedCredentials: Credential[] = data.map(cred => ({
        id: cred.id,
        username: cred.username,
        password: cred.password,
        locationId: cred.location_id,
        planId: String(cred.plan_id),
        planType: mapPlanIdToPlanType(String(cred.plan_id)),
        status: cred.status === 'used' ? 'used' : 'available',
        assignedTo: cred.assigned_to,
        assignedUserId: cred.assigned_to,
        assignedAt: cred.assigned_at,
        assignedDate: cred.assigned_at,
        createdAt: cred.created_at,
        updatedAt: cred.updated_at,
      }));

      setCredentials(formattedCredentials);
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  // Helper functions
  const mapTransactionStatusToPurchaseStatus = (status: string | null, expiryDate: string): 'active' | 'expired' | 'used' | 'pending' => {
    if (status === 'pending') return 'pending';
    if (status === 'failed') return 'expired';
    if (status === 'completed') {
      if (expiryDate && new Date(expiryDate) < new Date()) {
        return 'expired';
      }
      return 'active';
    }
    return 'pending';
  };

  const mapPlanIdToPlanType = (planId: string): '3-hour' | 'daily' | 'weekly' | 'monthly' | 'custom' => {
    // Handle legacy rows where plan_id stored the type string
    const legacyTypes = ['3-hour', 'daily', 'weekly', 'monthly', 'custom'] as const;
    if ((legacyTypes as readonly string[]).includes(planId)) {
      return planId as '3-hour' | 'daily' | 'weekly' | 'monthly' | 'custom';
    }
    const plan = plans.find(p => p.id === planId);
    if (!plan) return '3-hour';
    return plan.type;
  };

  // Plan management
  const addPlan = async (planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Validate required fields
      if (!planData.durationHours || planData.durationHours <= 0) {
        throw new Error('Duration hours is required and must be greater than 0');
      }
      if (!planData.name || planData.name.trim() === '') {
        throw new Error('Plan name is required');
      }
      if (!planData.price || planData.price <= 0) {
        throw new Error('Price must be greater than 0');
      }
      if (!planData.duration || planData.duration.trim() === '') {
        throw new Error('Duration description is required');
      }

      console.log('Adding plan with data:', planData);

      const { data, error } = await supabase
        .from('plans')
        .insert({
          name: planData.name.trim(),
          duration: planData.duration.trim(),
          duration_hours: planData.durationHours,
          price: planData.price,
          data_amount: planData.dataAmount || 'Unlimited',
          type: planData.type,
          popular: planData.popular || false,
          is_unlimited: planData.isUnlimited || false,
          is_active: planData.isActive !== false, // Default to true
          order: plans.length, // Add new plans at the end
        })
        .select()
        .single();

      if (error) {
        console.error('Database error adding plan:', error);
        throw new Error(`Failed to create plan: ${error.message}`);
      }

      const newPlan: Plan = {
        id: data.id,
        name: data.name,
        duration: data.duration,
        durationHours: data.duration_hours,
        price: data.price,
        dataAmount: data.data_amount,
        type: data.type,
        popular: data.popular,
        isUnlimited: data.is_unlimited,
        isActive: data.is_active,
        order: data.order || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPlans(prev => [...prev, newPlan]);
    } catch (error: any) {
      console.error('Error adding plan:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Error adding plan: ${errorMessage}`);
      throw error; // Re-throw so the UI can handle it
    }
  };

  const updatePlan = async (id: string, planUpdate: Partial<Plan>) => {
    try {
      const updateData: any = {};
      if (planUpdate.name) updateData.name = planUpdate.name;
      if (planUpdate.duration) updateData.duration = planUpdate.duration;
      if (planUpdate.durationHours) updateData.duration_hours = planUpdate.durationHours;
      if (planUpdate.price) updateData.price = planUpdate.price;
      if (planUpdate.dataAmount) updateData.data_amount = planUpdate.dataAmount;
      if (planUpdate.type) updateData.type = planUpdate.type;
      if (planUpdate.popular !== undefined) updateData.popular = planUpdate.popular;
      if (planUpdate.isUnlimited !== undefined) updateData.is_unlimited = planUpdate.isUnlimited;
      if (planUpdate.isActive !== undefined) updateData.is_active = planUpdate.isActive;

      const { error } = await supabase
        .from('plans')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating plan:', error);
        return;
      }

      setPlans(prev => prev.map(plan => 
        plan.id === id ? { ...plan, ...planUpdate } : plan
      ));
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting plan:', error);
        return;
      }

      setPlans(prev => prev.filter(plan => plan.id !== id));
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  // Location management
  const addLocation = async (locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: locationData.name,
          wifi_name: locationData.wifiName,
          is_active: locationData.isActive,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding location:', error);
        return;
      }

      const newLocation: Location = {
        id: data.id,
        name: data.name,
        wifiName: data.wifi_name,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setLocations(prev => [...prev, newLocation]);
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const updateLocation = async (id: string, locationUpdate: Partial<Location>) => {
    try {
      const updateData: any = {};
      if (locationUpdate.name) updateData.name = locationUpdate.name;
      if (locationUpdate.wifiName) updateData.wifi_name = locationUpdate.wifiName;
      if (locationUpdate.isActive !== undefined) updateData.is_active = locationUpdate.isActive;

      const { error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating location:', error);
        return;
      }

      setLocations(prev => prev.map(location => 
        location.id === id ? { ...location, ...locationUpdate } : location
      ));
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) {
        // If FK constraint (referenced by transactions), soft-disable instead
        if ((error as any).code === '23503') {
          const { error: updErr } = await supabase
            .from('locations')
            .update({ is_active: false })
            .eq('id', id);
          if (updErr) {
            console.error('Error disabling location:', updErr);
            return;
          }
          setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, isActive: false } : loc));
          return;
        }
        console.error('Error deleting location:', error);
        return;
      }

      setLocations(prev => prev.filter(location => location.id !== id));
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  // Credential management
  const addCredential = async (credential: Omit<Credential, 'id' | 'createdAt'>) => {
    try {
      // prevent duplicates locally
      const duplicate = credentials.find(c => c.username === credential.username && c.locationId === credential.locationId);
      if (duplicate) {
        throw new Error('Duplicate credential');
      }

      const { data, error } = await supabase
        .from('credential_pools')
        .insert({
          location_id: credential.locationId,
          plan_id: credential.planId,
          username: credential.username,
          password: credential.password,
          status: credential.status,
        })
        .select()
        .single();

      if (error) {
        // surface duplicate violation if any
        throw error;
      }

      const newCredential: Credential = {
        id: data.id,
        username: data.username,
        password: data.password,
        locationId: data.location_id,
        planId: data.plan_id,
        planType: mapPlanIdToPlanType(data.plan_id),
        status: data.status,
        assignedTo: data.assigned_to,
        assignedUserId: data.assigned_to,
        assignedAt: data.assigned_at,
        assignedDate: data.assigned_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setCredentials(prev => [...prev, newCredential]);
    } catch (error: any) {
      console.error('Error adding credential:', error);
      throw error;
    }
  };

  const bulkAddCredentials = async (credentialInputs: Array<Omit<Credential, 'id' | 'createdAt'>>): Promise<number> => {
    try {
      console.log('bulkAddCredentials called with:', credentialInputs);
      
      if (!credentialInputs || credentialInputs.length === 0) return 0;

      // Drop duplicates that already exist locally
      const uniqueInputs = credentialInputs.filter(ci =>
        !credentials.some(c => c.username === ci.username && c.locationId === ci.locationId)
      );

      console.log('After filtering duplicates:', uniqueInputs);

      const rows = uniqueInputs.map(ci => ({
        location_id: ci.locationId,
        plan_id: ci.planId,
        username: ci.username,
        password: ci.password,
        status: ci.status,
      }));

      console.log('Rows to insert into Supabase:', rows);

      const { data, error } = await supabase
        .from('credential_pools')
        .insert(rows)
        .select();

      console.log('Supabase insert response:', { data, error });

      if (error) {
        console.error('Error bulk adding credentials:', error);
        // Even if some failed, try to reload credentials so UI reflects DB state
        await loadCredentials();
        return 0;
      }

      if (data && Array.isArray(data)) {
        const added: Credential[] = data.map(cred => ({
          id: cred.id,
          username: cred.username,
          password: cred.password,
          locationId: cred.location_id,
          planId: cred.plan_id,
          planType: mapPlanIdToPlanType(cred.plan_id),
          status: cred.status === 'used' ? 'used' : 'available',
          assignedTo: cred.assigned_to,
          assignedUserId: cred.assigned_to,
          assignedAt: cred.assigned_at,
          assignedDate: cred.assigned_at,
          createdAt: cred.created_at,
          updatedAt: cred.updated_at,
        }));

        setCredentials(prev => {
          const updated = [...prev, ...added];
          console.log('Updated credentials state, now has', updated.length, 'total credentials');
          console.log('Added credentials for location', added[0]?.locationId, ':', added.map(c => c.username));
          return updated;
        });
        return added.length;
      }

      return 0;
    } catch (error) {
      console.error('Error bulk adding credentials:', error);
      await loadCredentials();
      return 0;
    }
  };

  const updateCredentialStatus = async (id: string, status: 'available' | 'used', assignedUserId?: string, assignedPurchaseId?: string) => {
    try {
      console.log(`Updating credential ${id} to status: ${status}, assigned to: ${assignedUserId}`);
      
      const updateData: any = {
        status,
        assigned_to: assignedUserId || null,
        assigned_at: status === 'used' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('credential_pools')
        .update(updateData)
        .eq('id', id)
        .select();

      console.log('Credential update response:', { data, error });

      if (error) {
        console.error('Error updating credential status:', error);
        return;
      }

      setCredentials(prev => prev.map(cred => 
        cred.id === id ? { 
          ...cred, 
          status, 
          assignedTo: assignedUserId,
          assignedUserId,
          assignedAt: updateData.assigned_at,
          assignedDate: updateData.assigned_at,
        } : cred
      ));
      // Sync to reflect any server-side triggers/constraints
      await loadCredentials();
    } catch (error) {
      console.error('Error updating credential status:', error);
    }
  };

  const deleteCredential = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credential_pools')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting credential:', error);
        return;
      }

      setCredentials(prev => prev.filter(cred => cred.id !== id));
    } catch (error) {
      console.error('Error deleting credential:', error);
    }
  };

  const getAvailableCredential = async (locationId: string, planId: string): Promise<Credential | null> => {
    try {
      const plan = plans.find(p => p.id === planId);
      const planType = plan?.type;
      
      // Get fresh credential data from Supabase
      const { data: allCreds, error: debugError } = await supabase
        .from('credential_pools')
        .select('*')
        .eq('location_id', locationId);
      
      // Use the fresh Supabase data instead of potentially stale local state
      const availableCreds = allCreds?.filter(cred => 
        cred.status === 'available' && cred.plan_id === planId
      ) || [];
      
      const row = availableCreds.length > 0 ? availableCreds[0] : null;
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        username: row.username,
        password: row.password,
        locationId: row.location_id,
        planId: String(row.plan_id),
        planType: mapPlanIdToPlanType(String(row.plan_id)),
        status: row.status,
        assignedTo: row.assigned_to,
        assignedUserId: row.assigned_to,
        assignedAt: row.assigned_at,
        assignedDate: row.assigned_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting available credential:', error);
      return null;
    }
  };

  const getCredentialsByLocation = (locationId: string, planIdOrType?: string): Credential[] => {
    return credentials.filter(cred =>
      cred.locationId === locationId &&
      (!planIdOrType || cred.planId === planIdOrType || cred.planType === planIdOrType as any)
    );
  };

  // Purchase management
  const purchasePlan = async (planId: string, locationId: string, userId: string): Promise<Purchase | null> => {
    // Prevent multiple simultaneous purchases
    if (isPurchaseInProgress) {
      console.error('Purchase already in progress');
      return null;
    }

    setIsPurchaseInProgress(true);
    
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return null;

      // First, verify user has sufficient balance with a fresh check
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      if (userError || !userProfile) {
        console.error('Error fetching user profile:', userError);
        return null;
      }

      if (userProfile.wallet_balance < plan.price) {
        console.error('Insufficient balance for purchase');
        return null;
      }

      // Get available credential
      const credential = await getAvailableCredential(locationId, planId);
      if (!credential) {
        console.error('No available credentials for this plan/location');
        return null;
      }

      // Create transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          plan_id: planId,
          location_id: locationId,
          credential_id: credential.id,
          amount: plan.price,
          type: 'plan_purchase',
          status: 'completed',
          mikrotik_username: credential.username,
          mikrotik_password: credential.password,
          purchase_date: new Date().toISOString(),
          expires_at: new Date(Date.now() + plan.durationHours * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating purchase:', error);
        return null;
      }

      // Mark credential as used and verify update
      await updateCredentialStatus(credential.id, 'used', userId);
      // Verify that credential is no longer available (best-effort)
      await loadCredentials();

      // Record referral earnings (write-through ledger)
      try {
        // Find referrer for this purchaser
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('referred_by, referredBy')
          .eq('id', userId)
          .maybeSingle();
        const referrerId = profileRow?.referred_by || profileRow?.referredBy;
        if (referrerId) {
          // Fetch referral percentage from admin_settings (default 10)
          const { data: rateRow } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'referral_reward_percentage')
            .maybeSingle();
          const rate = Math.max(0, parseFloat(rateRow?.value || '10'));
          const amount = Math.round((plan.price * (rate / 100)) * 100) / 100;
          await supabase.from('referral_earnings').insert([
            {
              referrer_id: referrerId,
              referred_user_id: userId,
              transaction_id: data.id,
              amount,
              rate,
              status: 'earned',
            },
          ]);
        }
      } catch (e) {
        console.error('Failed to write referral_earnings ledger:', e);
      }

      const newPurchase: Purchase = {
        id: data.id,
        userId: data.user_id,
        planId: data.plan_id || '',
        locationId: data.location_id || '',
        amount: data.amount,
        type: data.type,
        purchaseDate: data.purchase_date || data.created_at,
        expiryDate: data.expires_at || '',
        activationDate: data.activation_date,
        credentialId: data.credential_id,
        mikrotikCredentials: {
          username: data.mikrotik_username || '',
          password: data.mikrotik_password || '',
        },
        mikrotikUsername: data.mikrotik_username,
        mikrotikPassword: data.mikrotik_password,
        expiresAt: data.expires_at,
        status: mapTransactionStatusToPurchaseStatus(data.status, data.expires_at),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPurchases(prev => [newPurchase, ...prev]);
      // Ensure credentials reflect the used status and purchases reflect latest from DB
      await Promise.all([loadCredentials(), loadPurchases()]);
      return newPurchase;
    } catch (error) {
      console.error('Error purchasing plan:', error);
      return null;
    } finally {
      setIsPurchaseInProgress(false);
    }
  };

  const activatePurchase = async (purchaseId: string, userId: string): Promise<Purchase | null> => {
    try {
      const purchase = purchases.find(p => p.id === purchaseId && p.userId === userId);
      if (!purchase || purchase.status !== 'pending') return null;

      const plan = plans.find(p => p.id === purchase.planId);
      if (!plan) return null;

      const now = new Date();
      const expiryDate = new Date(now.getTime() + plan.durationHours * 60 * 60 * 1000);

      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          expires_at: expiryDate.toISOString(),
          activation_date: now.toISOString(),
        })
        .eq('id', purchaseId);

      if (error) {
        console.error('Error activating purchase:', error);
        return null;
      }

      const activatedPurchase: Purchase = {
        ...purchase,
        status: 'active',
        expiryDate: expiryDate.toISOString(),
        expiresAt: expiryDate.toISOString(),
        activationDate: now.toISOString(),
      };

      setPurchases(prev => prev.map(p => 
        p.id === purchaseId ? activatedPurchase : p
      ));

      return activatedPurchase;
    } catch (error) {
      console.error('Error activating purchase:', error);
      return null;
    }
  };

  const getUserPurchases = (userId: string): Purchase[] => {
    return purchases.filter(purchase => purchase.userId === userId);
  };

  const getAllPurchases = (): Purchase[] => {
    return purchases;
  };

  // Transaction management
  const getUserTransactions = (userId: string) => {
    return transactions.filter(transaction => transaction.user_id === userId);
  };

  const getAllTransactions = () => transactions;

  // Auto-update expired purchases
  useEffect(() => {
    if (purchases.length === 0) return;
    
    const now = new Date();
    let hasChanges = false;
    
    const updatedPurchases = purchases.map(purchase => {
      if (purchase.status === 'active' && purchase.expiryDate && new Date(purchase.expiryDate) < now) {
        hasChanges = true;
        return { ...purchase, status: 'expired' as const };
      }
      return purchase;
    });
    
    if (hasChanges) {
      setPurchases(updatedPurchases);
      console.log('Updated expired purchases');
    }
  }, [purchases]);

  return (
    <DataContext.Provider value={{
      plans,
      locations,
      purchases,
      credentials,
      loading,
      userDataLoading,
      isPurchaseInProgress,
      addPlan,
      updatePlan,
      deletePlan,
      addLocation,
      updateLocation,
      deleteLocation,
      addCredential,
      bulkAddCredentials,
      updateCredentialStatus,
      deleteCredential,
      getAvailableCredential,
      getCredentialsByLocation,
      purchasePlan,
      activatePurchase,
      getUserPurchases,
      getAllPurchases,
      getUserTransactions,
      getAllTransactions,
      refreshData: async () => {
        // Force a fresh load of all data
        console.log('Refreshing all data...');
        setLoading(true);
        try {
          // Load public data
          await Promise.all([
            loadPlans(),
            loadLocations()
          ]);
          
          // Load user data if authenticated
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await Promise.all([
              loadPurchases(),
              loadCredentials(),
              loadTransactions()
            ]);
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setLoading(false);
        }
      },
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};