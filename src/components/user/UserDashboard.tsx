import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
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
  const { user } = useAuth();
  const { getUserPurchases } = useData();

  // Remove the activation logic - we'll show recent transactions instead

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <div className="space-y-6">
            <NotificationBanner />
            <WalletCard onTopUpClick={() => setActivePage('virtual-account')} />
            <RecentTransactions onNavigateToHistory={() => setActivePage('settings')} />
            <PlansList onSeeAllClick={() => setActivePage('plans')} />
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
        <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-green-400 px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-white text-2xl font-bold">StarNetX</h1>
              <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h1 className="text-white text-xl font-normal mb-1">
              Hi {user?.email?.split('@')[0] || 'Osewa'},
            </h1>
            <p className="text-white text-base opacity-90">
              this is your recent usage
            </p>
          </div>
        </div>
        
        <main className="pb-32">
          <div className="px-4 -mt-6 relative">
            {renderContent()}
          </div>
        </main>
        <BottomNavigation activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  );
};