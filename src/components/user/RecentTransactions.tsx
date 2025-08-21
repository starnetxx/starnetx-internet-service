import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Clock, MapPin, Wifi, ArrowRight, TrendingUp } from 'lucide-react';

interface RecentTransactionsProps {
  onNavigateToHistory?: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ onNavigateToHistory }) => {
  const { user } = useAuth();
  const { getUserPurchases, plans, locations } = useData();

  const userPurchases = getUserPurchases(user?.id || '');
  
  // Get last 2 transactions, sorted by newest first
  const recentTransactions = userPurchases
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    .slice(0, 2);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (recentTransactions.length === 0) {
    return (
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <TrendingUp className="text-white" size={28} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2 text-lg">Start Your Journey</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Purchase your first plan to see your transaction history and start enjoying high-speed internet. View all transactions in Settings.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 mb-6 bg-white border-0 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sm:p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">Recent Activity</h3>
              <p className="text-blue-100 text-xs sm:text-sm">Your latest transactions</p>
            </div>
          </div>
          <span className="bg-white/20 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
            {recentTransactions.length} recent
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
        {recentTransactions.map((transaction, index) => {
          const plan = plans.find(p => p.id === transaction.planId);
          const location = locations.find(l => l.id === transaction.locationId);
          const purchaseDate = new Date(transaction.purchaseDate);
          
          return (
            <div 
              key={transaction.id} 
              className="group relative bg-gradient-to-r from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-md"
            >
              {/* Status indicator line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                transaction.status === 'active' ? 'bg-green-500' : 
                transaction.status === 'expired' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${
                    transaction.status === 'active' ? 'bg-green-100' : 
                    transaction.status === 'expired' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Wifi className={
                      transaction.status === 'active' ? 'text-green-600' : 
                      transaction.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
                    } size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                      {plan?.name || 'Unknown Plan'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span className="truncate max-w-[100px] sm:max-w-none">{location?.name || 'Unknown'}</span>
                      </div>
                      <span className="text-gray-400 hidden sm:inline">•</span>
                      <span className="text-[10px] sm:text-[11px] text-gray-500">
                        {purchaseDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}, {purchaseDate.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {transaction.status === 'active' && transaction.mikrotikCredentials && (
                      <div className="mt-1">
                        <span className="text-[10px] sm:text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 sm:py-1 rounded-md inline-block">
                          User: {transaction.mikrotikCredentials.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:block sm:text-right">
                  <span className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold ${getStatusColor(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </span>
                  <p className="text-base sm:text-lg font-bold text-gray-900 sm:mt-2">
                    ₦{transaction.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      {recentTransactions.length > 0 && (
        <div className="px-6 pb-6">
          <button 
            onClick={onNavigateToHistory}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-3 rounded-xl font-medium transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 group"
          >
            <span>View All Transactions in Settings</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </Card>
  );
};
