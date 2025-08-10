import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth, getAllUsers } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Copy, Users, DollarSign } from 'lucide-react';
import { supabase } from '../../utils/supabase';

export const ReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { getAllPurchases } = useData();
  const [copied, setCopied] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [howItWorks, setHowItWorks] = useState<{
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  }>({
    step1Title: 'Share your referral code',
    step1Desc: 'Send your unique link to friends and family',
    step2Title: 'They sign up and purchase',
    step2Desc: 'Your friend creates an account and buys their first plan',
    step3Title: 'You earn commission',
    step3Desc: 'You earn 10% commission on every purchase they make. Minimum withdrawal is ₦500.'
  });
  const [minPayout, setMinPayout] = useState<number>(500);
  const [payoutRequesting, setPayoutRequesting] = useState<boolean>(false);
  const [payoutMessage, setPayoutMessage] = useState<string>('');
  const [destinationType, setDestinationType] = useState<'wallet' | 'bank'>('wallet');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountName, setBankAccountName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const users = await getAllUsers();
        if (isMounted) setAllUsers(Array.isArray(users) ? users : []);
        // Load How it Works content from admin_settings if available
        const { data } = await supabase
          .from('admin_settings')
          .select('key, value')
          .in('key', [
            'referral_howitworks_step1_title',
            'referral_howitworks_step1_desc',
            'referral_howitworks_step2_title',
            'referral_howitworks_step2_desc',
            'referral_howitworks_step3_title',
            'referral_howitworks_step3_desc',
            'referral_min_payout'
          ]);
        if (data && Array.isArray(data)) {
          const map = data.reduce((acc: any, cur: any) => {
            acc[cur.key] = cur.value;
            return acc;
          }, {});
          setHowItWorks(prev => ({
            step1Title: map.referral_howitworks_step1_title || prev.step1Title,
            step1Desc: map.referral_howitworks_step1_desc || prev.step1Desc,
            step2Title: map.referral_howitworks_step2_title || prev.step2Title,
            step2Desc: map.referral_howitworks_step2_desc || prev.step2Desc,
            step3Title: map.referral_howitworks_step3_title || prev.step3Title,
            step3Desc: map.referral_howitworks_step3_desc || prev.step3Desc,
          }));
          if (map.referral_min_payout) setMinPayout(parseFloat(map.referral_min_payout));
        }
      } catch (e) {
        console.error('Error loading users for referrals:', e);
        if (isMounted) setAllUsers([]);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const allPurchases = getAllPurchases();
  const [referralEarnings, setReferralEarnings] = useState<number>(0);
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('referral_earnings')
          .select('amount, status')
          .eq('referrer_id', user.id);
        if (!error && data && data.length > 0) {
          const total = data
            .filter((r: any) => r.status === 'earned')
            .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
          setReferralEarnings(total);
          return;
        }
      } catch (e) {
        console.warn('Falling back to computed referral earnings:', e);
      }
      // Fallback: compute from purchases if ledger not available or empty
      try {
        const computed = (Array.isArray(allUsers) ? allUsers : [])
          .filter((u: any) => u.referredBy === user?.id)
          .map((referred) =>
            allPurchases
              .filter(p => p.userId === referred.id)
              .reduce((total, p) => total + (p.amount * 0.1), 0)
          )
          .reduce((a, b) => a + b, 0);
        setReferralEarnings(computed);
      } catch {}
    })();
  }, [user, allUsers, allPurchases]);

  const [referralBaseUrl, setReferralBaseUrl] = useState<string>('https://starnetx.com/signup');
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('key, value')
          .eq('key', 'referral_share_base_url')
          .maybeSingle();
        if (data?.value) setReferralBaseUrl(data.value);
      } catch {}
    })();
  }, []);
  const referralUrl = `${referralBaseUrl}?ref=${user?.referralCode}`;
  
  // Calculate user's referral statistics
  const myReferrals = (Array.isArray(allUsers) ? allUsers : []).filter((u: any) => u.referredBy === user?.id);
  const myEarnings = referralEarnings;

  const canRequestPayout = myEarnings >= minPayout;

  const requestPayout = async () => {
    if (!user) return;
    if (!canRequestPayout) return;
    if (destinationType === 'bank' && (!bankName || !bankAccountName || !bankAccountNumber)) {
      setPayoutMessage('Please provide bank name, account name and account number.');
      return;
    }
    setPayoutRequesting(true);
    setPayoutMessage('');
    try {
      const { error } = await supabase.from('referral_payouts').insert([
        {
          user_id: user.id,
          amount: Math.floor(myEarnings),
          status: 'pending',
          details: {
            note: 'User requested referral payout',
            destination_type: destinationType,
            bank_details: destinationType === 'bank' ? {
              bank_name: bankName,
              account_name: bankAccountName,
              account_number: bankAccountNumber
            } : null
          }
        }
      ]);
      if (error) throw error;
      setPayoutMessage('Payout request submitted!');
    } catch (e: any) {
      setPayoutMessage(e.message || 'Failed to submit payout request');
    } finally {
      setPayoutRequesting(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Friends</h1>
        <p className="text-gray-600">
          Earn 10% commission on every purchase your referred friends make
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Your Referral Code</h2>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Referral Code</p>
              <p className="text-xl font-mono font-bold text-blue-600">
                {user?.referralCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralCode}
              className="flex items-center gap-2"
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Share this link:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralCode}
            >
              Copy
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">Referral earnings eligible for payout at ≥ ₦{minPayout}</p>
              <p className="text-xs text-blue-700">Your earnings: ₦{myEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <Button onClick={requestPayout} disabled={!canRequestPayout || payoutRequesting}>
              {payoutRequesting ? 'Requesting...' : 'Request Payout'}
            </Button>
          </div>
          {payoutMessage && <p className="text-sm text-green-700 mt-2">{payoutMessage}</p>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Referral Statistics</h2>
        {myReferrals.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="text-blue-600" size={24} />
                </div>
                <p className="text-2xl font-bold text-blue-900">{myReferrals.length}</p>
                <p className="text-sm text-blue-700">Total Referrals</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="text-green-600" size={24} />
                </div>
                <p className="text-2xl font-bold text-green-900">₦{myEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-sm text-green-700">Total Earnings</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Your Referrals</h3>
              <div className="space-y-2">
                {myReferrals.map((referredUser) => {
                  const userPurchases = allPurchases.filter(p => p.userId === referredUser.id);
                  const userEarnings = userPurchases.reduce((total, purchase) => total + (purchase.amount * 0.1), 0);
                  
                  return (
                    <div key={referredUser.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{referredUser.email}</p>
                        <p className="text-sm text-gray-600">
                          Joined {new Date(referredUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₦{userEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-gray-600">{userPurchases.length} purchases</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : loadingUsers ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Loading referrals...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-600 mb-2">No referral data available yet</p>
            <p className="text-sm text-gray-500">Start sharing your referral code to see your earnings here!</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">How it Works</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">{howItWorks.step1Title}</p>
              <p className="text-sm text-gray-600">{howItWorks.step1Desc}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">{howItWorks.step2Title}</p>
              <p className="text-sm text-gray-600">{howItWorks.step2Desc}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">{howItWorks.step3Title}</p>
              <p className="text-sm text-gray-600">{howItWorks.step3Desc}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};