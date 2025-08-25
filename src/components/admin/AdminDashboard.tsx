import React, { useEffect, useState } from 'react';
import { useAuth, getAllUsers } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { LocationManager } from './LocationManager';
import { TransactionsView } from './TransactionsView';
import { ReferralTracking } from './ReferralTracking';
import { CredentialManager } from './CredentialManager';
import { PlanManager } from './PlanManager';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MapPin, DollarSign, Users, Wifi, Key, List, Trophy, Settings, Bell } from 'lucide-react';
import { UsersManager } from './UsersManager';
import { Leaderboard } from './Leaderboard';
import { AdminSettings } from './AdminSettings';
import { NotificationManager } from './NotificationManager';
import { User } from '../../types';
import { debugAdminDataLoading } from '../../utils/debugAdminData';
import { testRLS } from '../../utils/testRLS';

type AdminPage = 'overview' | 'plans' | 'locations' | 'credentials' | 'transactions' | 'referrals' | 'users' | 'leaderboard' | 'notifications' | 'settings';

export const AdminDashboard: React.FC = () => {
  const [activePage, setActivePage] = useState<AdminPage>('overview');
  const { logout } = useAuth();

  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return <AdminOverview />;
      case 'plans':
        return <PlanManager />;
      case 'locations':
        return <LocationManager />;
      case 'credentials':
        return <CredentialManager />;
      case 'transactions':
        return <TransactionsView />;
      case 'referrals':
        return <ReferralTracking />;
      case 'users':
        return <UsersManager />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'notifications':
        return <NotificationManager />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">StarNetX Admin</h1>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 space-y-2">
            <Card className="p-4">
              <nav className="space-y-1">
                {[
                  { id: 'overview', label: 'Overview', icon: DollarSign },
                  { id: 'plans', label: 'Plans', icon: List },
                  { id: 'locations', label: 'Locations', icon: MapPin },
                  { id: 'credentials', label: 'Credentials', icon: Key },
                  { id: 'transactions', label: 'Transactions', icon: Wifi },
                  { id: 'referrals', label: 'Referrals', icon: Users },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id as AdminPage)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activePage === item.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminOverview: React.FC = () => {
  const { getAllPurchases, locations, credentials } = useData();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const users = await getAllUsers();
        if (isMounted) setAllUsers(Array.isArray(users) ? users : []);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const allPurchases = getAllPurchases();
  
  // Calculate real statistics
  const totalRevenue = allPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const totalUsers = allUsers.length;
  const activeConnections = credentials.filter(cred => cred.status === 'used').length;
  const totalLocations = locations.length;
  
  const stats = {
    totalRevenue,
    totalUsers,
    activeConnections,
    totalLocations,
  };
  
  // Get recent activity (last 10 purchases)
  const recentActivity = [...allPurchases]
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    .slice(0, 4)
    .map(purchase => {
      const user = allUsers.find(u => u.id === purchase.userId);
      const timeDiff = Date.now() - new Date(purchase.purchaseDate).getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      const hoursAgo = Math.floor(minutesAgo / 60);
      const daysAgo = Math.floor(hoursAgo / 24);
      
      let timeDisplay;
      if (daysAgo > 0) {
        timeDisplay = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
      } else if (hoursAgo > 0) {
        timeDisplay = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
      } else {
        timeDisplay = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
      }
      
      return {
        action: `Plan purchased by ${user?.email?.split('@')[0] || 'User'}`,
        time: timeDisplay,
      };
    });
  
  // Add recent user registrations
  const recentUsers = [...allUsers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2)
    .map(user => {
      const timeDiff = Date.now() - new Date(user.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      const hoursAgo = Math.floor(minutesAgo / 60);
      const daysAgo = Math.floor(hoursAgo / 24);
      
      let timeDisplay;
      if (daysAgo > 0) {
        timeDisplay = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
      } else if (hoursAgo > 0) {
        timeDisplay = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
      } else {
        timeDisplay = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
      }
      
      return {
        action: `New user registration - ${user.email.split('@')[0]}`,
        time: timeDisplay,
      };
    });
  
  const combinedActivity = [...recentActivity, ...recentUsers]
    .sort((a, b) => {
      // Simple time sorting - in production you'd want more robust sorting
      const aMinutes = parseInt(a.time);
      const bMinutes = parseInt(b.time);
      return aMinutes - bMinutes;
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              console.log('Running debug...');
              debugAdminDataLoading();
            }}
            variant="outline"
            size="sm"
          >
            Debug Data Loading
          </Button>
          <Button 
            onClick={() => {
              console.log('Testing RLS...');
              testRLS();
            }}
            variant="outline"
            size="sm"
          >
            Test RLS
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₦{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Wifi className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeConnections}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Locations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLocations}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {combinedActivity.length > 0 ? (
            <div className="space-y-3">
              {combinedActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="text-gray-900">{activity.action}</span>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Plan Statistics</h3>
          {allPurchases.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                // Calculate plan popularity
                const planCounts: { [key: string]: number } = {};
                allPurchases.forEach(purchase => {
                  planCounts[purchase.planId] = (planCounts[purchase.planId] || 0) + 1;
                });
                
                const totalPurchases = allPurchases.length;
                const planStats = Object.entries(planCounts)
                  .map(([planId, count]) => {
                    // Find plan name - you might need to import plans from DataContext
                    const planNames: { [key: string]: string } = {
                      '1': 'Quick Browse',
                      '2': 'Daily Essential',
                      '3': 'Weekly Standard',
                      '4': 'Monthly Premium',
                    };
                    return {
                      plan: planNames[planId] || `Plan ${planId}`,
                      purchases: count,
                      percentage: Math.round((count / totalPurchases) * 100),
                    };
                  })
                  .sort((a, b) => b.purchases - a.purchases)
                  .slice(0, 4);
                
                return planStats.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-900">{item.plan}</span>
                      <span className="text-sm text-gray-600">{item.purchases} purchases</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No purchase data available</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};