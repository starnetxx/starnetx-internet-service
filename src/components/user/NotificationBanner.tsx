import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Bell, 
  X, 
  ExternalLink, 
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  ChevronRight
} from 'lucide-react';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  description?: string;
  video_url?: string;
  youtube_url?: string;
  target_audience: 'all' | 'new_users' | 'specific_users';
  is_active: boolean;
  show_as_popup: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: string;
  created_at: string;
  viewed?: boolean;
  dismissed?: boolean;
}

export const NotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupNotification, setPopupNotification] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      // Get user's creation date to determine if they're a new user (within last 7 days)
      const userCreatedAt = new Date(user.createdAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isNewUser = userCreatedAt > sevenDaysAgo;

      // First, get all active notifications
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      // Add targeting filter
      if (isNewUser) {
        query = query.in('target_audience', ['all', 'new_users']);
      } else {
        query = query.eq('target_audience', 'all');
      }

      // Order by priority (urgent > high > normal > low) then by creation date
      query = query.order('created_at', { ascending: false });

      const { data: notifications, error } = await query;

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      // Get user's view records for these notifications
      let userViews = [];
      if (notifications.length > 0) {
        const notificationIds = notifications.map(n => n.id);
        const { data, error: viewsError } = await supabase
          .from('user_notification_views')
          .select('*')
          .eq('user_id', user.id)
          .in('notification_id', notificationIds);

        if (viewsError) {
          console.error('Error loading user views:', viewsError);
        } else {
          userViews = data || [];
        }
      }

      // Process notifications to include view status
      const processedNotifications = notifications.map(notification => {
        const userView = userViews?.find(view => view.notification_id === notification.id);
        
        return {
          ...notification,
          viewed: !!userView?.viewed_at,
          dismissed: !!userView?.dismissed_at
        };
      });

      // Filter out dismissed notifications
      const activeNotifications = processedNotifications.filter(n => !n.dismissed);

      // Sort by priority (urgent > high > normal > low) then by creation date
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      activeNotifications.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // If same priority, sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setNotifications(activeNotifications);

      // Show popup for high priority notifications that haven't been viewed
      const popupCandidate = activeNotifications.find(
        n => n.show_as_popup && !n.viewed && (n.priority === 'high' || n.priority === 'urgent')
      );
      
      if (popupCandidate) {
        setPopupNotification(popupCandidate);
      }

    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (notificationId: string) => {
    if (!user) return;

    try {
      // Use upsert with onConflict to handle existing records
      const { error } = await supabase
        .from('user_notification_views')
        .upsert({
          user_id: user.id,
          notification_id: notificationId,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,notification_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error marking notification as viewed:', error);
        return;
      }

      // Update local state
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, viewed: true }
          : notification
      ));

    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      // Use upsert with onConflict to handle existing records
      const { error } = await supabase
        .from('user_notification_views')
        .upsert({
          user_id: user.id,
          notification_id: notificationId,
          viewed_at: new Date().toISOString(),
          dismissed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,notification_id'
        });

      if (error) {
        console.error('Error dismissing notification:', error);
        return;
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Close popup if it's the same notification
      if (popupNotification?.id === notificationId) {
        setPopupNotification(null);
      }

    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="text-red-600" size={20} />;
      case 'high':
        return <AlertCircle className="text-orange-600" size={20} />;
      case 'normal':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'low':
        return <Clock className="text-gray-600" size={20} />;
      default:
        return <Bell className="text-blue-600" size={20} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-green-500 bg-green-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const openVideoLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Banner Notifications */}
      <div className="space-y-3">
        {notifications.slice(0, 2).map((notification) => (
          <Card
            key={notification.id}
            className={`border-l-4 ${getPriorityColor(notification.priority)} p-4 cursor-pointer transition-all hover:shadow-md`}
            onClick={() => markAsViewed(notification.id)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getPriorityIcon(notification.priority)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-gray-700 text-sm mb-2">
                      {notification.message}
                    </p>
                    
                    {notification.description && (
                      <p className="text-gray-600 text-xs mb-3">
                        {notification.description}
                      </p>
                    )}
                    
                    {/* Video Links */}
                    {(notification.video_url || notification.youtube_url) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {notification.video_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVideoLink(notification.video_url!);
                            }}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Play size={14} />
                            Watch Video
                          </Button>
                        )}
                        
                        {notification.youtube_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVideoLink(notification.youtube_url!);
                            }}
                            className="flex items-center gap-1 text-xs"
                          >
                            <ExternalLink size={14} />
                            YouTube Tutorial
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                      
                      {!notification.viewed && (
                        <span className="text-xs text-blue-600 font-medium">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {/* Show more notifications indicator */}
        {notifications.length > 2 && (
          <Card className="p-3 border-dashed border-2 border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Bell size={16} />
              <span className="text-sm">
                {notifications.length - 2} more notification{notifications.length - 2 !== 1 ? 's' : ''}
              </span>
              <ChevronRight size={16} />
            </div>
          </Card>
        )}
      </div>

      {/* Popup Modal */}
      {popupNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0">
                  {getPriorityIcon(popupNotification.priority)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {popupNotification.title}
                  </h3>
                  <p className="text-gray-700 mb-3">
                    {popupNotification.message}
                  </p>
                  
                  {popupNotification.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {popupNotification.description}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Video Links in Popup */}
              {(popupNotification.video_url || popupNotification.youtube_url) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {popupNotification.video_url && (
                    <Button
                      variant="outline"
                      onClick={() => openVideoLink(popupNotification.video_url!)}
                      className="flex items-center gap-2"
                    >
                      <Play size={16} />
                      Watch Video
                    </Button>
                  )}
                  
                  {popupNotification.youtube_url && (
                    <Button
                      variant="outline"
                      onClick={() => openVideoLink(popupNotification.youtube_url!)}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink size={16} />
                      YouTube Tutorial
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    markAsViewed(popupNotification.id);
                    setPopupNotification(null);
                  }}
                  className="flex-1"
                >
                  Got it
                </Button>
                <Button
                  variant="outline"
                  onClick={() => dismissNotification(popupNotification.id)}
                  className="flex-1"
                >
                  Don't show again
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
