import React from 'react';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { PurchaseReceiptModal } from './PurchaseReceiptModal';
import { TransactionHistory } from './TransactionHistory';
import { Purchase } from '../../types';
import { User, Wifi, LogOut, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';

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
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransactionHistory(false)}
            className="flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            Back to Settings
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
        </div>
        <TransactionHistory />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            onClick={() => setShowTransactionHistory(true)}
            className="flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Receipt className="text-blue-600" size={20} />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Transaction History</p>
                <p className="text-sm text-gray-600">View all your payments and purchases</p>
              </div>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-xl font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.email}</h2>
            {user?.phone && (
              <p className="text-gray-600">{user.phone}</p>
            )}
            <p className="text-gray-600">Member since {new Date(user?.createdAt || '').toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Wallet Balance</p>
            <p className="text-lg font-bold text-gray-900">₦{user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Referral Code</p>
            <p className="text-lg font-bold text-blue-600">{user?.referralCode}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Purchases</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransactionHistory(true)}
            className="flex items-center gap-2"
          >
            <Receipt size={16} />
            View All Transactions
          </Button>
        </div>
        {userPurchases.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No purchases yet</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {currentPurchases.map((purchase) => (
                <div 
                  key={purchase.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedPurchase(purchase)}
                >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Receipt className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Plan Purchase</p>
                    <p className="text-sm text-gray-600">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₦{purchase.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    purchase.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : purchase.status === 'expired'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {purchase.status}
                  </span>
                </div>
              </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="space-y-3">
        <Card className="p-4">
          <button className="w-full flex items-center gap-3 text-left">
            <User className="text-gray-600" size={20} />
            <span className="text-gray-900">Account Information</span>
          </button>
        </Card>

      </div>

      <Button
        variant="danger"
        onClick={logout}
        className="w-full flex items-center justify-center gap-2"
      >
        <LogOut size={20} />
        Sign Out
      </Button>
      
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