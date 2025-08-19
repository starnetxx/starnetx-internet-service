import React from 'react';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { PurchaseReceiptModal } from './PurchaseReceiptModal';
import { TransactionHistory } from './TransactionHistory';
import { Purchase } from '../../types';
import { User, Wifi, LogOut, ChevronLeft, ChevronRight, Receipt, Settings, CreditCard, Shield, Bell, HelpCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { getUserPurchases } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const itemsPerPage = 5;

  const userPurchases = getUserPurchases(user?.id || '');
  
  // Calculate pagination
  const totalPages = Math.ceil(userPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = userPurchases.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Show transaction history if requested
  if (showTransactionHistory) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransactionHistory(false)}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <ChevronLeft size={16} />
            Back to Settings
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        </div>
        <TransactionHistory />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-500 to-gray-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Settings className="text-white" size={32} />
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse delay-1000"></div>
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 mb-3 bg-gradient-to-r from-slate-600 to-gray-700 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Manage your account and preferences
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border border-blue-100 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Actions</h2>
          <p className="text-gray-600">Access your most important features</p>
        </div>
        
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowTransactionHistory(true)}
            className="w-full flex items-center justify-between p-6 h-auto bg-white/80 backdrop-blur-sm border-2 border-white/50 rounded-2xl hover:bg-white hover:border-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Receipt className="text-white" size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg text-gray-900">Transaction History</p>
                <p className="text-gray-600">View all your payments and purchases</p>
              </div>
            </div>
            <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors duration-200" size={24} />
          </Button>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 border border-emerald-100 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Information</h2>
          <p className="text-gray-600">Your account details and statistics</p>
        </div>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl flex items-center justify-center shadow-xl border-2 border-white/30">
            <span className="text-white text-2xl font-black">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{user?.email}</h3>
            {user?.phone && (
              <p className="text-gray-600 text-lg mb-2">{user.phone}</p>
            )}
            <p className="text-gray-600">Member since {new Date(user?.createdAt || '').toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="text-emerald-600" size={20} />
              <p className="text-sm text-gray-600 font-medium">Wallet Balance</p>
            </div>
            <p className="text-2xl font-black text-emerald-600">₦{user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <User className="text-blue-600" size={20} />
              <p className="text-sm text-gray-600 font-medium">Referral Code</p>
            </div>
            <p className="text-2xl font-black text-blue-600">{user?.referralCode}</p>
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-8 border border-gray-100 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Purchases</h2>
            <p className="text-gray-600">Your latest plan purchases and status</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransactionHistory(true)}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Receipt size={16} />
            View All Transactions
          </Button>
        </div>
        
        {userPurchases.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Receipt className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-600 text-lg font-medium">No purchases yet</p>
            <p className="text-gray-500">Start your journey by purchasing your first plan!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {currentPurchases.map((purchase) => (
                <div 
                  key={purchase.id} 
                  className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedPurchase(purchase)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Receipt className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-900">Plan Purchase</p>
                        <p className="text-gray-600">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-gray-900 mb-2">₦{purchase.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        purchase.status === 'active' 
                          ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' 
                          : purchase.status === 'expired'
                          ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-200'
                          : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200'
                      }`}>
                        {purchase.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Account Options */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border border-purple-100 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Options</h2>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        
        <div className="space-y-4">
          <button className="w-full flex items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 group">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <User className="text-white" size={24} />
            </div>
            <span className="text-gray-900 font-semibold text-lg">Account Information</span>
            <ChevronRight className="text-gray-400 group-hover:text-purple-600 transition-colors duration-200 ml-auto" size={20} />
          </button>
          
          <button className="w-full flex items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Shield className="text-white" size={24} />
            </div>
            <span className="text-gray-900 font-semibold text-lg">Privacy & Security</span>
            <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors duration-200 ml-auto" size={20} />
          </button>
          
          <button className="w-full flex items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 group">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
              <Bell className="text-white" size={24} />
            </div>
            <span className="text-gray-900 font-semibold text-lg">Notifications</span>
            <ChevronRight className="text-gray-400 group-hover:text-emerald-600 transition-colors duration-200 ml-auto" size={20} />
          </button>
          
          <button className="w-full flex items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 group">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <HelpCircle className="text-white" size={24} />
            </div>
            <span className="text-gray-900 font-semibold text-lg">Help & Support</span>
            <ChevronRight className="text-gray-400 group-hover:text-orange-600 transition-colors duration-200 ml-auto" size={20} />
          </button>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="text-center">
        <Button
          variant="danger"
          onClick={logout}
          className="w-full max-w-md flex items-center justify-center gap-3 py-4 px-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <LogOut size={20} />
          Sign Out
        </Button>
      </div>
      
      {/* Purchase Receipt Modal */}
      {selectedPurchase && (
        <PurchaseReceiptModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </div>
  );
};