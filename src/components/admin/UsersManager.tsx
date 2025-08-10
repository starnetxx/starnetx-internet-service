import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../utils/supabase';
import { useData } from '../../contexts/DataContext';
import { getAllUsers } from '../../contexts/AuthContext';
import { User, Purchase } from '../../types';

export const UsersManager: React.FC = () => {
  const { getAllPurchases } = useData();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const allPurchases = getAllPurchases();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getAllUsers();
        setUsers(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.referralCode || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageUsers = filtered.slice(startIndex, endIndex);

  const getUserPurchases = (userId: string): Purchase[] => allPurchases.filter(p => p.userId === userId);

  const [depositAmountByUser, setDepositAmountByUser] = useState<Record<string, string>>({});
  const [depositLoading, setDepositLoading] = useState<string>('');

  const depositToUser = async (userId: string) => {
    const amtStr = (depositAmountByUser[userId] || '').trim();
    if (!amtStr) return;
    setDepositLoading(userId);
    try {
      const amount = Math.max(0, parseFloat(amtStr));
      if (!amount) throw new Error('Enter a valid amount');
      // Fetch profile to get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .maybeSingle();
      const current = Number(profile?.wallet_balance || 0);
      const newBalance = Math.round((current + amount) * 100) / 100;
      // Update balance
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);
      if (uErr) throw uErr;
      // Insert transaction record
      const { error: tErr } = await supabase.from('transactions').insert([
        {
          user_id: userId,
          type: 'wallet_funding',
          amount,
          status: 'success',
          flutterwave_reference: `ADMIN-${Date.now()}`,
        },
      ]);
      if (tErr) {
        console.error('Admin deposit transaction insert failed:', tErr);
        alert('Deposit credited. Note: could not record transaction due to a permission policy. See admin SQL note.');
      }
      // Update local UI state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, walletBalance: (u.walletBalance || 0) + amount } : u));
      setDepositAmountByUser(prev => ({ ...prev, [userId]: '' }));
      alert('Funds deposited');
    } catch (e: any) {
      alert(e.message || 'Deposit failed');
    } finally {
      setDepositLoading('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        <div className="w-full sm:w-64">
          <Input label="Search" value={query} onChange={(v) => { setQuery(v); setCurrentPage(1); }} placeholder="Search email, phone, referral code" />
        </div>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading users...</div>
        ) : pageUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Email</th>
                  <th className="text-left py-3">Phone</th>
                 <th className="text-left py-3">Wallet</th>
                 <th className="text-left py-3">Deposit</th>
                  <th className="text-left py-3">Joined</th>
                  <th className="text-left py-3">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map(u => {
                  const purchases = getUserPurchases(u.id);
                  const totalSpent = purchases.reduce((s, p) => s + p.amount, 0);
                  return (
                    <tr key={u.id} className="border-b align-top">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">{u.email}</div>
                        <div className="text-xs text-gray-500">{u.role === 'admin' ? 'Admin' : 'User'}</div>
                      </td>
                      <td className="py-3">{u.phone || '-'}</td>
                     <td className="py-3">₦{u.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                     <td className="py-3">
                       <div className="flex items-center gap-2">
                         <input
                           type="number"
                           className="px-2 py-1 border rounded w-28"
                           placeholder="Amount"
                           value={depositAmountByUser[u.id] || ''}
                           onChange={(e)=>setDepositAmountByUser(prev => ({ ...prev, [u.id]: e.target.value }))}
                         />
                         <Button
                           size="sm"
                           onClick={()=>depositToUser(u.id)}
                           disabled={!!depositLoading || !(depositAmountByUser[u.id] || '').trim()}
                         >
                           {depositLoading === u.id ? 'Depositing...' : 'Deposit'}
                         </Button>
                       </div>
                     </td>
                      <td className="py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        {u.role === 'admin' ? (
                          <div className="text-xs text-gray-500">Admin account</div>
                        ) : purchases.length === 0 ? (
                          <div className="text-xs text-gray-500">No purchases</div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600">Total spent: ₦{totalSpent.toFixed(2)}</div>
                            <div className="max-h-40 overflow-y-auto border rounded">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="text-left p-2">Date</th>
                                    <th className="text-left p-2">Plan</th>
                                    <th className="text-left p-2">Amount</th>
                                    <th className="text-left p-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchases.map(p => (
                                    <tr key={p.id} className="border-t">
                                      <td className="p-2">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                                      <td className="p-2">{p.planId}</td>
                                      <td className="p-2">₦{p.amount.toFixed(2)}</td>
                                      <td className="p-2 capitalize">{p.status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between pt-4">
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};


