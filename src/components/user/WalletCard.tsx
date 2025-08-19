import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { CreditCard, TrendingUp } from 'lucide-react';

interface WalletCardProps {
  onTopUpClick?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ onTopUpClick }) => {
  const { user, loading } = useAuth();

  // Show loading state while user data is being fetched
  if (loading) {
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

  return (
    <div className="bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 mb-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 rounded-3xl"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-emerald-400/10 to-green-500/10 rounded-full blur-xl"></div>
      
      {/* Content */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
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
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-white/20 max-[400px]:px-3 max-[400px]:py-2"
        >
          <TrendingUp className="w-4 h-4 mr-2 max-[400px]:w-3 max-[400px]:h-3 max-[400px]:mr-1" />
          <span className="text-sm font-bold sm:text-sm max-[400px]:text-xs">Top Up +</span>
        </Button>
      </div>
      
      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent rounded-b-3xl"></div>
    </div>
  );
};