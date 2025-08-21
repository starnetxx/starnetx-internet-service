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
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none transform-gpu max-[380px]:bottom-3 max-[360px]:bottom-2 max-[350px]:bottom-1">
      <div className="w-[92%] mx-auto pointer-events-auto max-[380px]:w-[94%] max-[360px]:w-[96%] max-[350px]:w-[98%]">
        {/* Main Navigation Container */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl min-[360px]:rounded-3xl shadow-2xl border border-gray-100/50 px-2 py-3 min-[360px]:px-3 min-[360px]:py-4 relative will-change-transform">
          {/* Navigation Items */}
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex-1 flex flex-col items-center py-2 min-[360px]:py-3 px-1 min-[360px]:px-2 rounded-xl min-[360px]:rounded-2xl transition-all duration-200 relative group ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {/* Active Background */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl min-[360px]:rounded-2xl shadow-lg"></div>
                  )}
                  
                  {/* Icon Container */}
                  <div className={`relative z-10 flex items-center justify-center w-10 h-10 min-[360px]:w-12 min-[360px]:h-12 rounded-xl min-[360px]:rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'bg-gray-100/60 hover:bg-gray-200/80'
                  }`}>
                    <Icon 
                      size={20} 
                      className="transition-all duration-200 min-[360px]:w-6 min-[360px]:h-6"
                    />
                  </div>
                  
                  {/* Label */}
                  <span className="text-[10px] min-[360px]:text-xs mt-1 min-[360px]:mt-2 font-semibold relative z-10">
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