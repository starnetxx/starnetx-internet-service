import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plan, Location } from '../../types';

interface PurchaseModalProps {
  plan: Plan;
  onClose: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ plan, onClose }) => {
  const { locations, purchasePlan } = useData();
  const { user, updateWalletBalance } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [purchase, setPurchase] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  const handlePurchase = () => {
    if (!selectedLocation || !user) return;

    if (user.walletBalance < plan.price) {
      setShowInsufficientBalance(true);
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedLocation || !user) return;

    const newPurchase = await purchasePlan(plan.id, selectedLocation.id, user.id);
    if (!newPurchase) {
      setShowOutOfStock(true);
      return;
    }
    
    await updateWalletBalance(-plan.price);
    setPurchase(newPurchase);
    setShowReceipt(true);
  };

  if (showReceipt && purchase) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
        <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Plan Purchased!</h2>
            <p className="text-gray-600">Your plan is ready to activate</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Plan Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span>{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data:</span>
                  <span>
                    {plan.isUnlimited ? 'Unlimited' : `${plan.dataAmount} GB`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{plan.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>₦{plan.price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-yellow-900">Next Steps</h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>1. Connect to WiFi: <span className="font-medium">{selectedLocation?.wifiName}</span></p>
                <p>2. Go to your home screen</p>
                <p>3. Click "Start Plan" to activate your internet access</p>
                <div className="mt-3 bg-white p-3 rounded border">
                  <p className="text-xs font-semibold text-yellow-900 mb-1">Your login credentials</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-800">Username:</span>
                    <span className="font-mono">{purchase?.mikrotikCredentials?.username}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-800">Password:</span>
                    <span className="font-mono">{purchase?.mikrotikCredentials?.password}</span>
                  </div>
                  <p className="text-[11px] text-yellow-700 mt-2">Use these after tapping "Start Plan" on the home screen.</p>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="p-6 pt-4">
            <Button onClick={onClose} className="w-full">
              Go to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Purchase Plan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{plan.name}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Data: {plan.dataAmount}</p>
              <p>Duration: {plan.duration}</p>
              <p className="text-lg font-bold text-gray-900">Price: ₦{plan.price.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Select Location</h3>
            <div className="space-y-2">
              {locations.filter(loc => loc.isActive).map((location) => (
                <label
                  key={location.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    selectedLocation?.id === location.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="location"
                    value={location.id}
                    checked={selectedLocation?.id === location.id}
                    onChange={() => setSelectedLocation(location)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-gray-600">WiFi: {location.wifiName}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedLocation && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Make sure you're connected to the WiFi: "{selectedLocation.wifiName}" 
                before purchasing your plan.
              </p>
            </div>
          )}
          </div>
        </div>

        <div className="p-6 pt-4 border-t flex-shrink-0">
          <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedLocation || (user?.walletBalance || 0) < plan.price}
            className="flex-1"
          >
            Purchase
          </Button>
          </div>
          
          {user && user.walletBalance < plan.price && (
            <p className="text-red-600 text-sm text-center mt-2">
              Insufficient balance. Current: ₦{user.walletBalance.toFixed(2)}
            </p>
          )}
        </div>
      </Card>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Confirm Purchase"
        message={`Are you sure you want to purchase this plan for WiFi network "${selectedLocation?.wifiName}"?\n\nPlease confirm you are connected to this network before proceeding.`}
        type="confirm"
        onConfirm={handleConfirmPurchase}
        confirmText="Purchase"
        cancelText="Cancel"
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