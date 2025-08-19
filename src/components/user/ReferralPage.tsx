import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth, getAllUsers } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Copy, Users, DollarSign, Share2, TrendingUp, Gift, ArrowRight, Star, Sparkles } from 'lucide-react';
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
    <div className="space-y-8 min-h-[calc(100vh-400px)] max-[380px]:min-h-[calc(100vh-350px)] max-[360px]:min-h-[calc(100vh-320px)] max-[350px]:min-h-[calc(100vh-300px)]">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Share2 className="text-white" size={32} />
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-pulse delay-1000"></div>
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
          Invite Friends
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Earn 10% commission on every purchase your referred friends make
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border border-blue-100 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Referral Code</h2>
          <p className="text-gray-600">Share this unique code with friends and family</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Referral Code</p>
              <p className="text-3xl font-black text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text">
                {user?.referralCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralCode}
              className="flex items-center gap-2 bg-white border-2 border-blue-200 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 font-medium">Share this link:</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={referralUrl}
              readOnly
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm text-sm font-medium focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralCode}
              className="px-6 py-3 bg-white border-2 border-blue-200 text-blue-700 font-semibold rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Copy
            </Button>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-800 font-semibold mb-1">
                Referral earnings eligible for payout at ≥ ₦{minPayout}
              </p>
              <p className="text-lg text-emerald-900 font-bold">
                Your earnings: ₦{myEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Button 
              onClick={requestPayout} 
              disabled={!canRequestPayout || payoutRequesting}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold px-6 py-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {payoutRequesting ? 'Requesting...' : 'Request Payout'}
            </Button>
          </div>
          {payoutMessage && (
            <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-2xl text-sm font-medium">
              {payoutMessage}
            </div>
          )}
        </div>
      </div>

      {/* Referral Statistics */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-8 border border-gray-100 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Referral Statistics</h2>
          <p className="text-gray-600">Track your referral success and earnings</p>
        </div>
        
        {myReferrals.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-center text-white shadow-xl border border-blue-400/30">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                  <Users className="text-white" size={28} />
                </div>
                <p className="text-4xl font-black mb-2 drop-shadow-lg">{myReferrals.length}</p>
                <p className="text-blue-100 font-semibold">Total Referrals</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl text-center text-white shadow-xl border border-emerald-400/30">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                  <DollarSign className="text-white" size={28} />
                </div>
                <p className="text-4xl font-black mb-2 drop-shadow-lg">₦{myEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-emerald-100 font-semibold">Total Earnings</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={24} />
                Your Referrals
              </h3>
              <div className="space-y-3">
                {myReferrals.map((referredUser) => {
                  const userPurchases = allPurchases.filter(p => p.userId === referredUser.id);
                  const userEarnings = userPurchases.reduce((total, purchase) => total + (purchase.amount * 0.1), 0);
                  
                  return (
                    <div key={referredUser.id} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{referredUser.email}</p>
                          <p className="text-sm text-gray-600">
                            Joined {new Date(referredUser.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-2xl text-emerald-600">₦{userEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-600">{userPurchases.length} purchases</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : loadingUsers ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Users className="text-blue-400" size={32} />
            </div>
            <p className="text-gray-600 mb-2 text-lg font-medium">Loading referrals...</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Users className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-600 mb-2 text-lg font-medium">No referral data available yet</p>
            <p className="text-gray-500">Start sharing your referral code to see your earnings here!</p>
          </div>
        )}
      </div>

      {/* How it Works */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border border-purple-100 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How it Works</h2>
          <p className="text-gray-600">Simple steps to start earning with referrals</p>
        </div>
        
        <div className="space-y-6">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg border-2 border-white/30">
              1
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900 mb-2">{howItWorks.step1Title}</p>
              <p className="text-gray-600 leading-relaxed">{howItWorks.step1Desc}</p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg border-2 border-white/30">
              2
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900 mb-2">{howItWorks.step2Title}</p>
              <p className="text-gray-600 leading-relaxed">{howItWorks.step2Desc}</p>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg border-2 border-white/30">
              3
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900 mb-2">{howItWorks.step3Title}</p>
              <p className="text-gray-600 leading-relaxed">{howItWorks.step3Desc}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Consistent bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
};