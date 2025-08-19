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
  const { getUserPurchases, plans, locations, userDataLoading } = useData();

  const userPurchases = getUserPurchases(user?.id || '');
  
  // Get last 2 transactions, sorted by newest first
  const recentTransactions = userPurchases
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    .slice(0, 2);

  // Show loading state while user data is being fetched
  if (userDataLoading) {
    return (
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Clock className="text-white" size={28} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2 text-lg">Loading...</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Fetching your recent transactions...
          </p>
        </div>
      </Card>
    );
  }

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
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Recent Activity</h3>
              <p className="text-blue-100 text-sm">Your latest transactions</p>
            </div>
          </div>
          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
            {recentTransactions.length} recent
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-6 space-y-4">
        {recentTransactions.map((transaction, index) => {
          const plan = plans.find(p => p.id === transaction.planId);
          const location = locations.find(l => l.id === transaction.locationId);
          const purchaseDate = new Date(transaction.purchaseDate);
          
          return (
            <div 
              key={transaction.id} 
              className="group relative bg-gradient-to-r from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-md"
            >
              {/* Status indicator line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                transaction.status === 'active' ? 'bg-green-500' : 
                transaction.status === 'expired' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    transaction.status === 'active' ? 'bg-green-100' : 
                    transaction.status === 'expired' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Wifi className={
                      transaction.status === 'active' ? 'text-green-600' : 
                      transaction.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
                    } size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">
                      {plan?.name || 'Unknown Plan'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <MapPin size={14} />
                      <span>{location?.name || 'Unknown Location'}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-[11px] text-gray-500">
                        {purchaseDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {transaction.status === 'active' && transaction.mikrotikCredentials && (
                      <div className="mt-1 flex items-center gap-2 overflow-x-auto">
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0">
                          Username: {transaction.mikrotikCredentials.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </span>
                  <p className="text-lg font-bold text-gray-900 mt-2">
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
