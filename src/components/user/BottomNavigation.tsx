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
    <div className="fixed bottom-4 left-4 right-4 z-40">
      <div className="w-[90%] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-2 py-3">
          <div className="flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={22} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};