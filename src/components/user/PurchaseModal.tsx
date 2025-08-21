import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plan, Location } from '../../types';
import { Wifi } from 'lucide-react';

interface PurchaseModalProps {
  plan: Plan;
  onClose: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ plan, onClose }) => {
  const { locations, purchasePlan, isPurchaseInProgress } = useData();
  const { user, updateWalletBalance } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [purchase, setPurchase] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Use global purchase lock to prevent multiple purchases
  const isDisabled = isProcessing || isPurchaseInProgress;

  const handlePurchase = () => {
    if (!selectedLocation || !user || isDisabled) return;

    if (user.walletBalance < plan.price) {
      setShowInsufficientBalance(true);
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedLocation || !user || isDisabled) return;

    setIsProcessing(true);
    setProcessingError(null);
    setShowConfirmation(false);

    try {
      // Create the purchase first
      const newPurchase = await purchasePlan(plan.id, selectedLocation.id, user.id);
      if (!newPurchase) {
        setShowOutOfStock(true);
        setIsProcessing(false);
        return;
      }
      
      // Update wallet balance after successful purchase
      await updateWalletBalance(-plan.price);
      
      setPurchase(newPurchase);
      setShowReceipt(true);
    } catch (error) {
      console.error('Purchase failed:', error);
      setProcessingError('Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Prevent modal from being closed while processing
  const handleClose = () => {
    if (isDisabled) return;
    onClose();
  };

  if (showReceipt && purchase) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
        <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
              <span className="text-white text-3xl font-bold">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Plan Purchased!</h2>
            <p className="text-green-100 text-lg">Your plan is ready to activate</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Plan Details Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                  Plan Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-semibold text-gray-900">{plan.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-semibold text-gray-900">
                      {plan.isUnlimited ? 'Unlimited' : `${plan.dataAmount} GB`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-900">{plan.duration}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-blue-600 text-lg">₦{plan.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps Card */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200">
                <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">→</span>
                  </div>
                  Next Steps
                </h3>
                <div className="space-y-3 text-sm text-amber-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
                    <p>Connect to WiFi: <span className="font-mono font-bold">{selectedLocation?.wifiName}</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
                    <p>Go to your home screen</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
                    <p>Click "Start Plan" to activate your internet access</p>
                  </div>
                  
                  {/* Credentials Card */}
                  <div className="mt-4 bg-white p-4 rounded-xl border border-amber-300">
                    <p className="text-sm font-bold text-amber-900 mb-3">Your Login Credentials</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-800 font-medium">Username:</span>
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{purchase?.mikrotikCredentials?.username}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-800 font-medium">Password:</span>
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{purchase?.mikrotikCredentials?.password}</span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700 mt-3 text-center">
                      Use these after tapping "Start Plan" on the home screen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50">
            <button 
              onClick={handleClose} 
              className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/25 transform hover:-translate-y-1"
            >
              Go to Home
            </button>
                      </div>
          </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 pb-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Purchase Plan</h2>
              <p className="text-blue-100 text-sm mt-1">Select location and confirm</p>
            </div>
            <button 
              onClick={handleClose} 
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Plan Details Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <Wifi className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-blue-600 font-medium">{plan.dataAmount} • {plan.duration}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-gray-900">₦{plan.price.toLocaleString()}</div>
                <p className="text-gray-600 text-sm">Total Amount</p>
              </div>
            </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Select Location</h3>
            <div className="space-y-3">
              {locations.filter(loc => loc.isActive).map((location) => (
                <label
                  key={location.id}
                  className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                    selectedLocation?.id === location.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    selectedLocation?.id === location.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedLocation?.id === location.id && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="location"
                    value={location.id}
                    checked={selectedLocation?.id === location.id}
                    onChange={() => setSelectedLocation(location)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{location.name}</p>
                    <p className="text-sm text-gray-600">WiFi: <span className="font-mono font-medium">{location.wifiName}</span></p>
                  </div>
                  {selectedLocation?.id === location.id && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {selectedLocation && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-sm text-amber-800 font-medium">
                    <strong>Important:</strong> Make sure you're connected to the WiFi: 
                  </p>
                  <p className="text-sm text-amber-700 font-mono mt-1">"{selectedLocation.wifiName}"</p>
                  <p className="text-sm text-amber-700 mt-1">before purchasing your plan.</p>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isDisabled}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-semibold rounded-2xl transition-all duration-200 border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={!selectedLocation || (user?.walletBalance || 0) < plan.price || isDisabled}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Processing...
                  </div>
                ) : isPurchaseInProgress ? (
                  'Purchase in Progress...'
                ) : (
                  'Purchase Plan'
                )}
              </button>
            </div>
            
            {/* Status Messages */}
            {user && user.walletBalance < plan.price && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">
                    Insufficient balance. Current: ₦{user.walletBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {isPurchaseInProgress && !isProcessing && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-700 text-sm">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">Another purchase is in progress. Please wait...</span>
                </div>
              </div>
            )}
            {processingError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">{processingError}</span>
                </div>
              </div>
            )}
                      </div>
          </div>
        </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => !isDisabled && setShowConfirmation(false)}
        title="Confirm Purchase"
        message={`Are you sure you want to purchase this plan for WiFi network "${selectedLocation?.wifiName}"?\n\nPlease confirm you are connected to this network before proceeding.`}
        type="confirm"
        onConfirm={handleConfirmPurchase}
        confirmText={isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            Processing...
          </div>
        ) : "Purchase"}
        cancelText="Cancel"
        disabled={isDisabled}
      />

      <ConfirmationModal
        isOpen={showInsufficientBalance}
        onClose={() => setShowInsufficientBalance(false)}
        title="Insufficient Balance"
        message="You don't have enough balance to purchase this plan. Please top up your wallet and try again."
        type="alert"
      />

      <ConfirmationModal
        isOpen={showOutOfStock}
        onClose={() => setShowOutOfStock(false)}
        title="Plan Unavailable"
        message="Sorry, this plan is currently out of login slots. Please try again later or choose another plan/location."
        type="alert"
      />
    </div>
  );
};