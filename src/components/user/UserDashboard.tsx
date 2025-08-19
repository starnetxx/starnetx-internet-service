import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WalletCard } from './WalletCard';
import { RecentTransactions } from './RecentTransactions';

import { PlansList } from './PlansList';
import { VirtualAccountPage } from './VirtualAccountPage';
import { BottomNavigation } from './BottomNavigation';
import { ReferralPage } from './ReferralPage';
import { SettingsPage } from './SettingsPage';
import { NotificationBanner } from './NotificationBanner';
import { Bell, ChevronDown } from 'lucide-react';

type ActivePage = 'home' | 'plans' | 'referrals' | 'settings' | 'virtual-account';

export const UserDashboard: React.FC = () => {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const { user, refreshSession } = useAuth();
  const { getUserPurchases, refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOnline, isSlow } = useNetworkStatus();

  // Remove the activation logic - we'll show recent transactions instead

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh both auth session and data
      await Promise.all([
        refreshSession(),
        refreshData()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <div className="space-y-6">
            <NotificationBanner />
            <WalletCard onTopUpClick={() => setActivePage('virtual-account')} />
            <RecentTransactions onNavigateToHistory={() => setActivePage('settings')} />
            <PlansList onSeeAllClick={() => setActivePage('plans')} />
            
            {/* Safe Area Spacer for Bottom Navigation */}
            <div className="h-20"></div>
          </div>
        );
      case 'plans':
        return <PlansList showAll={true} />;
      case 'referrals':
        return <ReferralPage />;
      case 'settings':
        return <SettingsPage />;
      case 'virtual-account':
        return <VirtualAccountPage onBack={() => setActivePage('home')} />;
      default:
        return null;
    }
  };

  // Don't show header and bottom nav for virtual account page
  if (activePage === 'virtual-account') {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-green-400">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 px-4 pt-12 pb-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-b-3xl"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-white text-3xl font-black tracking-tight drop-shadow-lg">StarNetX</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl text-white/90 hover:text-white hover:bg-white/30 transition-all duration-200 disabled:opacity-50 border border-white/20"
                  title="Refresh"
                >
                  <svg 
                    className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                  <span className="text-white font-black text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6 relative z-10">
            <h2 className="text-white text-2xl font-bold mb-2 tracking-tight drop-shadow-lg">
              Hi {user?.email?.split('@')[0] || 'User'},
            </h2>
            <p className="text-white/90 text-lg font-medium">
              this is your recent usage
            </p>
          </div>

          {/* Network Status Indicator */}
          {(!isOnline || isSlow) && (
            <div className="mb-4 p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 relative z-10">
              <div className="flex items-center gap-3 text-white text-sm font-medium">
                {!isOnline ? (
                  <>
                    <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                    <span>You're offline. Some features may not work.</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg"></div>
                    <span>Slow connection detected. Please be patient.</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <main className="pb-40">
          <div className="px-4 -mt-6 relative">
            {renderContent()}
          </div>
        </main>
        <BottomNavigation activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  );
};