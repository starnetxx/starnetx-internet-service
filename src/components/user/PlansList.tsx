import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { PurchaseModal } from './PurchaseModal';
import { Plan } from '../../types';
import { ChevronRight, Wifi, Zap, Clock, Star, Sparkles, Rocket, Signal } from 'lucide-react';

interface PlansListProps {
  showAll?: boolean;
  onSeeAllClick?: () => void;
}

export const PlansList: React.FC<PlansListProps> = ({ showAll = false, onSeeAllClick }) => {
  const { plans, isPurchaseInProgress, loading } = useData();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  const displayPlans = showAll ? plans : plans.slice(0, 2);

  // Show loading state while plans are being fetched
  if (loading) {
    return (
      <div>
        {/* Hero Section with Loading State */}
        <div className="text-center space-y-4 mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
              <Rocket className="text-white" size={32} />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-pulse delay-1000"></div>
          </div>
          
          <h2 className="text-4xl font-black text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
            {showAll ? 'Choose Your Plan' : 'Featured Plans'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {showAll ? 'Select the perfect plan for your needs' : 'Most popular options'}
          </p>
        </div>
        
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-28 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-36"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Placeholder removed to avoid misleading availability counts

  const getPlanIcon = (type: string) => {
    switch (type) {
      case '3-hour': return '⚡';
      case 'daily': return '📱';
      case 'weekly': return '📶';
      case 'monthly': return '🚀';
      default: return '📶';
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Rocket className="text-white" size={32} />
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-pulse delay-1000"></div>
        </div>
        
        <h2 className="text-4xl font-black text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
          {showAll ? 'Choose Your Plan' : 'Featured Plans'}
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {showAll ? 'Select the perfect plan for your needs' : 'Most popular options'}
        </p>
        
        {!showAll && (
          <div className="pt-4">
          <button 
            onClick={onSeeAllClick}
              className="inline-flex items-center gap-2 text-blue-600 text-lg font-semibold hover:text-blue-700 transition-all duration-200 hover:scale-105"
          >
              View All Plans
              <ChevronRight className="w-5 h-5" />
          </button>
          </div>
        )}
      </div>

      {isPurchaseInProgress && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="text-amber-600" size={16} />
            </div>
            <p className="text-amber-800 text-sm font-medium">
              Purchase in progress. Please wait before starting another transaction.
            </p>
          </div>
        </div>
      )}

      <div className={showAll ? 'space-y-6' : 'grid grid-cols-2 gap-6'}>
        {displayPlans.map((plan, index) => {
          // Dynamic color schemes based on plan type
          const getPlanColors = (planType: string, isPopular: boolean) => {
            if (isPopular) {
              return {
                bg: 'from-blue-500 via-blue-600 to-indigo-600',
                border: 'border-blue-300',
                ring: 'ring-blue-500/30',
                shadow: 'shadow-blue-500/20',
                iconBg: 'from-blue-500 to-indigo-600',
                buttonBg: 'from-blue-500 to-indigo-600',
                buttonShadow: 'shadow-blue-500/30'
              };
            }
            
            switch (planType) {
              case '3-hour':
                return {
                  bg: 'from-orange-400 via-orange-500 to-red-500',
                  border: 'border-orange-300',
                  ring: 'ring-orange-500/20',
                  shadow: 'shadow-orange-500/15',
                  iconBg: 'from-orange-400 to-red-500',
                  buttonBg: 'from-orange-400 to-red-500',
                  buttonShadow: 'shadow-orange-500/25'
                };
              case 'daily':
                return {
                  bg: 'from-green-400 via-green-500 to-emerald-600',
                  border: 'border-green-300',
                  ring: 'ring-green-500/20',
                  shadow: 'shadow-green-500/15',
                  iconBg: 'from-green-400 to-emerald-600',
                  buttonBg: 'from-green-400 to-emerald-600',
                  buttonShadow: 'shadow-green-500/25'
                };
              case 'weekly':
                return {
                  bg: 'from-purple-400 via-purple-500 to-violet-600',
                  border: 'border-purple-300',
                  ring: 'ring-purple-500/20',
                  shadow: 'shadow-purple-500/15',
                  iconBg: 'from-purple-400 to-violet-600',
                  buttonBg: 'from-purple-400 to-violet-600',
                  buttonShadow: 'shadow-purple-500/25'
                };
              case 'monthly':
                return {
                  bg: 'from-pink-400 via-pink-500 to-rose-600',
                  border: 'border-pink-300',
                  ring: 'ring-pink-500/20',
                  shadow: 'shadow-pink-500/15',
                  iconBg: 'from-pink-400 to-rose-600',
                  buttonBg: 'from-pink-400 to-rose-600',
                  buttonShadow: 'shadow-pink-500/25'
                };
              default:
                return {
                  bg: 'from-gray-400 via-gray-500 to-slate-600',
                  border: 'border-gray-300',
                  ring: 'ring-gray-500/20',
                  shadow: 'shadow-gray-500/15',
                  iconBg: 'from-gray-400 to-slate-600',
                  buttonBg: 'from-gray-400 to-slate-600',
                  buttonShadow: 'shadow-gray-500/25'
                };
            }
          };

          const colors = getPlanColors(plan.type, plan.popular);
          
          return (
            <div
            key={plan.id}
              className={`group relative bg-gradient-to-br ${colors.bg} rounded-3xl p-6 border-2 ${colors.border} transition-all duration-500 ${
                plan.popular 
                  ? `ring-4 ${colors.ring} shadow-2xl ${colors.shadow}` 
                  : `ring-2 ${colors.ring} shadow-lg ${colors.shadow} hover:shadow-2xl`
              } ${
                isPurchaseInProgress 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:-translate-y-2 hover:scale-105'
              }`}
              onClick={() => !isPurchaseInProgress && setSelectedPlan(plan)}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
              
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl border-2 border-white/20">
                  <Star className="w-3 h-3 inline mr-1" />
                  Most Popular
                </div>
              )}

              {/* Plan Icon */}
              <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 bg-gradient-to-br ${colors.iconBg} shadow-xl border-2 border-white/30`}>
                {plan.popular ? (
                  <Sparkles className="text-white" size={28} />
                ) : (
                  <Wifi className="text-white" size={28} />
                )}
                {/* Icon Glow */}
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl"></div>
              </div>

              {/* Plan Details */}
              <div className="relative space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                  {plan.name}
                  </h3>
                  <p className="text-white/90 text-sm font-medium">
                    {plan.dataAmount} • {plan.duration}
                </p>
              </div>

                {/* Price */}
                <div className="pt-2">
                  <div className="text-4xl font-black text-white drop-shadow-lg">
                    ₦{plan.price.toLocaleString()}
                  </div>
                  <p className="text-white/80 text-sm font-medium">
                    {plan.duration.toLowerCase()}
                  </p>
            </div>

                {/* Action Button */}
                <div className="pt-4">
                  <div className={`w-full py-4 px-6 rounded-2xl text-center font-bold text-lg transition-all duration-300 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 hover:scale-105 ${colors.buttonShadow}`}>
                    {plan.popular ? 'Get Started Now' : 'Select Plan'}
                  </div>
              </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-3 h-3 bg-white/30 rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/20 rounded-full"></div>
              
              {/* Hover Arrow */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <ChevronRight className="text-white" size={20} />
                </div>
              </div>

              {/* Bottom Border Accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-b-3xl`}></div>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <PurchaseModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
      
      {/* Safe Area Spacer for Bottom Navigation (only when showing all plans) */}
      {showAll && <div className="h-20"></div>}
    </div>
  );
};