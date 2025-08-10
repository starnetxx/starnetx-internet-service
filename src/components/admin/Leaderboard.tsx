import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { getAllUsers } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Trophy, Crown, Medal, TrendingUp, Users, DollarSign, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const { getAllPurchases } = useData();
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await getAllUsers();
      setAllUsers(users);
    };
    fetchUsers();
  }, []);
  const [activeTab, setActiveTab] = useState<'buyers' | 'revenue' | 'frequency'>('buyers');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const purchases = getAllPurchases();

  // Calculate user statistics
  const userStats = useMemo(() => {
    const stats = new Map();
    
    purchases.forEach(purchase => {
      const userId = purchase.userId;
      const user = allUsers.find(u => u.id === userId);
      
      if (!user) return;
      
      if (!stats.has(userId)) {
        stats.set(userId, {
          user,
          totalPurchases: 0,
          totalSpent: 0,
          firstPurchase: purchase.purchaseDate,
          lastPurchase: purchase.purchaseDate,
          activePlans: 0,
        });
      }
      
      const userStat = stats.get(userId);
      userStat.totalPurchases += 1;
      userStat.totalSpent += purchase.amount;
      
      // Update first and last purchase dates
      if (new Date(purchase.purchaseDate) < new Date(userStat.firstPurchase)) {
        userStat.firstPurchase = purchase.purchaseDate;
      }
      if (new Date(purchase.purchaseDate) > new Date(userStat.lastPurchase)) {
        userStat.lastPurchase = purchase.purchaseDate;
      }
      
      // Count active plans
      if (purchase.status === 'active') {
        userStat.activePlans += 1;
      }
    });
    
    return Array.from(stats.values());
  }, [purchases, allUsers]);

  // Calculate frequency (purchases per month)
  const userFrequencyStats = useMemo(() => {
    return userStats.map(stat => {
      const firstPurchase = new Date(stat.firstPurchase);
      const lastPurchase = new Date(stat.lastPurchase);
      const monthsDiff = Math.max(1, (lastPurchase.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const purchasesPerMonth = stat.totalPurchases / monthsDiff;
      
      return {
        ...stat,
        purchasesPerMonth,
        daysSinceLastPurchase: Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });
  }, [userStats]);

  const getTopUsersByCategory = (category: 'buyers' | 'revenue' | 'frequency') => {
    let sortedUsers = [...userFrequencyStats];
    
    switch (category) {
      case 'buyers':
        sortedUsers.sort((a, b) => b.totalPurchases - a.totalPurchases);
        break;
      case 'revenue':
        sortedUsers.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case 'frequency':
        sortedUsers.sort((a, b) => b.purchasesPerMonth - a.purchasesPerMonth);
        break;
    }
    
    return sortedUsers;
  };

  // Pagination logic
  const allSortedUsers = getTopUsersByCategory(activeTab);
  const totalPages = Math.ceil(allSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = allSortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when changing tabs
  const handleTabChange = (tab: 'buyers' | 'revenue' | 'frequency') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-500" size={20} />;
      case 2:
        return <Trophy className="text-gray-400" size={20} />;
      case 3:
        return <Medal className="text-amber-600" size={20} />;
      default:
        return <span className="text-gray-500 font-bold">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-500 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };



  const tabs = [
    { id: 'buyers' as const, label: 'Top Buyers', icon: Users, description: 'Most purchases' },
    { id: 'revenue' as const, label: 'Top Revenue', icon: DollarSign, description: 'Highest spending' },
    { id: 'frequency' as const, label: 'Most Active', icon: TrendingUp, description: 'Purchase frequency' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Leaderboard</h2>
          <p className="text-gray-600">Track your most valuable and active customers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{userStats.length}</p>
              <p className="text-sm text-gray-600">Total Customers</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ₦{userStats.reduce((sum, stat) => sum + stat.totalSpent, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {userStats.length > 0 ? (userStats.reduce((sum, stat) => sum + stat.totalPurchases, 0) / userStats.length).toFixed(1) : '0'}
              </p>
              <p className="text-sm text-gray-600">Avg Purchases/User</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label} - {tabs.find(t => t.id === activeTab)?.description}
          </h3>
          <span className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, allSortedUsers.length)} of {allSortedUsers.length} users
          </span>
        </div>

        <div className="space-y-3">
          {paginatedUsers.map((user, index) => {
            const rank = startIndex + index + 1;
            return (
              <div
                key={user.user.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${
                  rank <= 3 ? 'border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${getRankColor(rank)}`}>
                    {rank <= 3 ? getRankIcon(rank) : `#${rank}`}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.user.email}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>{user.totalPurchases} purchases</span>
                      <span>•</span>
                      <span>₦{user.totalSpent.toLocaleString()}</span>
                      <span>•</span>
                      <span>{user.daysSinceLastPurchase} days ago</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {activeTab === 'buyers' && user.totalPurchases}
                    {activeTab === 'revenue' && `₦${user.totalSpent.toLocaleString()}`}
                    {activeTab === 'frequency' && `${user.purchasesPerMonth.toFixed(1)}/mo`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.activePlans > 0 ? `${user.activePlans} active` : 'No active plans'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}

        {paginatedUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-400" size={32} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No Customer Data</h3>
            <p className="text-gray-500">User statistics will appear here once customers start making purchases.</p>
          </div>
        )}
      </Card>
    </div>
  );
};
