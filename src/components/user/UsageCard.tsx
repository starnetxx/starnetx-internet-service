import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Purchase, Plan } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Wifi } from 'lucide-react';

interface UsageCardProps {
  purchase: Purchase;
}

export const UsageCard: React.FC<UsageCardProps> = ({ purchase }) => {
  const { plans, locations, activatePurchase } = useData();
  const { user } = useAuth();
  
  const plan = plans.find(p => p.id === purchase.planId);
  const location = locations.find(l => l.id === purchase.locationId);
  
  if (!plan || !location) return null;

  const handleActivatePlan = () => {
    if (user) {
      activatePurchase(purchase.id, user.id);
    }
  };

  // If purchase is pending, show activation interface
  if (purchase.status === 'pending') {
    return (
      <Card className="p-6 mb-6">
        <div className="flex gap-2 mb-4">
          <span className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full">
            Ready to Start
          </span>
          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
            Internet
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Wifi className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">
                {plan.isUnlimited ? 'Unlimited' : `${plan.dataAmount} GB`}
              </p>
              <p className="text-sm text-gray-500">{plan.name}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-xs text-gray-500">Ready to start</p>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2 text-blue-900">WiFi Connection Required</h3>
          <p className="text-sm text-blue-800 mb-3">
            Make sure you're connected to: <span className="font-medium">{location.wifiName}</span>
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Username:</span>
              <span className="font-mono bg-white px-2 py-1 rounded">
                {purchase.mikrotikCredentials.username}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Password:</span>
              <span className="font-mono bg-white px-2 py-1 rounded">
                {purchase.mikrotikCredentials.password}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleActivatePlan}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold"
        >
          Start Plan ({plan.duration})
        </Button>
      </Card>
    );
  }
  const expiryDate = new Date(purchase.expiryDate);
  const isExpired = expiryDate < new Date();
  
  // Calculate remaining time
  const now = new Date();
  const timeLeft = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
  
  let timeDisplay = '';
  let timeValue = '';
  let timeUnit = '';
  
  if (timeLeft <= 0) {
    timeDisplay = 'Expired';
    timeValue = '0';
    timeUnit = 'Expired';
  } else if (daysLeft > 1) {
    timeDisplay = `${daysLeft} days left`;
    timeValue = daysLeft.toString();
    timeUnit = daysLeft === 1 ? 'Day' : 'Days';
  } else if (hoursLeft > 1) {
    timeDisplay = `${hoursLeft} hours left`;
    timeValue = hoursLeft.toString();
    timeUnit = hoursLeft === 1 ? 'Hour' : 'Hours';
  } else {
    timeDisplay = `${minutesLeft} minutes left`;
    timeValue = minutesLeft.toString();
    timeUnit = minutesLeft === 1 ? 'Min' : 'Mins';
  }

  // Calculate progress percentage based on time elapsed
  const startTime = purchase.activationDate ? new Date(purchase.activationDate) : new Date(purchase.purchaseDate);
  const totalDuration = new Date(purchase.expiryDate).getTime() - startTime.getTime();
  const timeElapsed = now.getTime() - startTime.getTime();
  const progressPercentage = Math.min((timeElapsed / totalDuration) * 100, 100);

  return (
    <Card className="p-6 mb-6">
      {!isExpired && (
        <div className="flex gap-2 mb-4">
          <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
            In Use
          </span>
          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
            Internet
          </span>
        </div>
      )}
      
      {isExpired && (
        <div className="flex gap-2 mb-4">
          <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
            Expired
          </span>
          <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
            Internet
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Wifi className="text-green-600" size={20} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">
              {plan.dataAmount}
            </p>
            <p className="text-sm text-gray-500">{plan?.name || 'Plan'}</p>
          </div>
        </div>
        
        <div className="relative">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={timeLeft <= 0 ? "#ef4444" : timeLeft < (24 * 60 * 60 * 1000) ? "#f59e0b" : "#10b981"}
                strokeWidth="3"
                strokeDasharray={`${progressPercentage}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${timeLeft <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {timeValue}
              </span>
              <span className={`text-sm font-medium ${timeLeft <= 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {timeUnit}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {timeLeft <= 0 ? 'Plan Expired' : 'remaining'}
          </p>
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-600 mb-1">
          {timeLeft <= 0 ? 'Expired On' : 'Active Until'}
        </p>
        <p className="text-lg font-semibold text-gray-900">
          {expiryDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {timeDisplay}
        </p>
        
        {isExpired && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800 text-center">
              This plan has expired. Purchase a new plan to continue using the internet.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};