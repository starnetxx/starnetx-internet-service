import React from 'react';
import { Home, Wifi, Users, Settings } from 'lucide-react';

type ActivePage = 'home' | 'plans' | 'referrals' | 'settings';

interface BottomNavigationProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activePage,
  onPageChange,
}) => {
  const navItems = [
    { id: 'home' as ActivePage, icon: Home, label: 'Home' },
    { id: 'plans' as ActivePage, icon: Wifi, label: 'Plans' },
    { id: 'referrals' as ActivePage, icon: Users, label: 'Referrals' },
    { id: 'settings' as ActivePage, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-6 left-4 right-4 z-40">
      <div className="w-[92%] mx-auto">
        {/* Main Navigation Container */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100/50 px-3 py-4 relative">
          {/* Navigation Items */}
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex-1 flex flex-col items-center py-3 px-2 rounded-2xl transition-all duration-200 relative group ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {/* Active Background */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg"></div>
                  )}
                  
                  {/* Icon Container */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'bg-gray-100/60 hover:bg-gray-200/80'
                  }`}>
                    <Icon 
                      size={24} 
                      className="transition-all duration-200"
                    />
                  </div>
                  
                  {/* Label */}
                  <span className="text-xs mt-2 font-semibold relative z-10">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Safety Area Indicator (for devices with home indicators) */}
        <div className="w-16 h-1 bg-gray-300/30 rounded-full mx-auto mt-3 opacity-60"></div>
      </div>
    </div>
  );
};