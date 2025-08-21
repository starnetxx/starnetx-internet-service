import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { CreditCard, TrendingUp } from 'lucide-react';

interface WalletCardProps {
  onTopUpClick?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ onTopUpClick }) => {
  const { user, authUser } = useAuth();

  // Show skeleton while user data is loading
  if (!user && authUser) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-100/50 mb-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="w-24 h-10 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Don't show anything if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl mb-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full"></div>
      </div>

      <div className="relative flex flex-col min-[400px]:flex-row items-start min-[400px]:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 min-[400px]:w-12 min-[400px]:h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <CreditCard className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Balance</p>
            <p className="text-lg min-[360px]:text-xl min-[400px]:text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm break-all">
              ₦{user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
        </div>

        <Button
          onClick={onTopUpClick}
          variant="secondary"
          className="w-full min-[400px]:w-auto !bg-white hover:!bg-white !text-gray-900 font-black px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm sm:text-base border-2 border-white/50"
        >
          <TrendingUp className="mr-1.5 sm:mr-2" size={16} />
          <span className="uppercase tracking-wide">Top Up +</span>
        </Button>
      </div>
    </div>
  );
};