import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { CreditCard } from 'lucide-react';

interface WalletCardProps {
  onTopUpClick?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ onTopUpClick }) => {
  const { user } = useAuth();



  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <CreditCard className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Balance</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              ₦ {user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '124.50'}
            </p>
          </div>
        </div>
        <Button
          onClick={onTopUpClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium"
        >
          <span className="hidden sm:inline">+ Top Up Balance</span>
          <span className="sm:hidden">+ Top Up</span>
        </Button>
      </div>
    </div>
  );
};