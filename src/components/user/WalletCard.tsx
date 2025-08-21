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
    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 shadow-2xl mb-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full"></div>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
            <CreditCard className="text-white" size={24} />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium mb-2">Balance</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight drop-shadow-sm max-[400px]:text-xl">
              ₦ {user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
        </div>

        <Button
          onClick={onTopUpClick}
          className="bg-white/90 hover:bg-white text-gray-900 font-bold px-4 py-2 sm:px-6 sm:py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 max-[400px]:px-3 max-[400px]:py-2 max-[400px]:text-sm"
        >
          <TrendingUp className="mr-2 max-[400px]:mr-1" size={18} />
          <span className="hidden sm:inline">Top Up</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </div>
  );
};