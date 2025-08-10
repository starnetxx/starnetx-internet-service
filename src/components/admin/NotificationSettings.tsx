import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../utils/supabase';
import { Bell, Settings, Save, AlertCircle } from 'lucide-react';

interface NotificationSettingsData {
  notifications_enabled: boolean;
  max_notifications_per_user: number;
  default_notification_duration_days: number;
  allow_popup_notifications: boolean;
  auto_dismiss_low_priority: boolean;
}

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    notifications_enabled: true,
    max_notifications_per_user: 3,
    default_notification_duration_days: 30,
    allow_popup_notifications: true,
    auto_dismiss_low_priority: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'notifications_enabled',
          'max_notifications_per_user',
          'default_notification_duration_days',
          'allow_popup_notifications',
          'auto_dismiss_low_priority'
        ]);

      if (error) {
        console.error('Error loading notification settings:', error);
        return;
      }

      // Convert array to object
      const settingsObj = data.reduce((acc: any, item) => {
        let value = item.value;
        
        // Convert string values to appropriate types
        if (item.key === 'notifications_enabled' || 
            item.key === 'allow_popup_notifications' || 
            item.key === 'auto_dismiss_low_priority') {
          value = value === 'true';
        } else if (item.key === 'max_notifications_per_user' || 
                   item.key === 'default_notification_duration_days') {
          value = parseInt(value) || 0;
        }
        
        acc[item.key] = value;
        return acc;
      }, {});

      setSettings(prev => ({ ...prev, ...settingsObj }));
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Convert settings to array format for upsert
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value.toString()
      }));

      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsArray);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Bell className="text-blue-600" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
          <p className="text-gray-600 text-sm">Configure how notifications work for users</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <AlertCircle size={16} />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Enable Notifications</h4>
            <p className="text-gray-600 text-sm">Turn the notification system on or off</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                notifications_enabled: e.target.checked 
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Max Notifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Notifications Per User
          </label>
          <Input
            type="number"
            value={settings.max_notifications_per_user.toString()}
            onChange={(value) => setSettings(prev => ({ 
              ...prev, 
              max_notifications_per_user: parseInt(value) || 0 
            }))}
            placeholder="3"
            min="1"
            max="10"
          />
          <p className="text-gray-500 text-xs mt-1">
            Maximum number of notifications to show at once
          </p>
        </div>

        {/* Default Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Notification Duration (Days)
          </label>
          <Input
            type="number"
            value={settings.default_notification_duration_days.toString()}
            onChange={(value) => setSettings(prev => ({ 
              ...prev, 
              default_notification_duration_days: parseInt(value) || 0 
            }))}
            placeholder="30"
            min="1"
            max="365"
          />
          <p className="text-gray-500 text-xs mt-1">
            How long notifications remain active by default
          </p>
        </div>

        {/* Popup Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Allow Popup Notifications</h4>
            <p className="text-gray-600 text-sm">Enable modal popups for high-priority notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allow_popup_notifications}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                allow_popup_notifications: e.target.checked 
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Auto Dismiss */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Auto-dismiss Low Priority</h4>
            <p className="text-gray-600 text-sm">Automatically dismiss low priority notifications after 7 days</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.auto_dismiss_low_priority}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                auto_dismiss_low_priority: e.target.checked 
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
