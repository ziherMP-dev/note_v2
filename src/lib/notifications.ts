import { supabase } from './supabase';

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Store the notification permission in the user's profile
      const { error } = await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id,
          notifications_enabled: true
        });

      if (error) throw error;
      return true;
    }
    throw new Error('Permission denied');
  } catch (error) {
    console.error('Notification permission error:', error);
    throw error;
  }
}

export function scheduleNotification(content: string, notificationTime: string) {
  const timeUntilNotification = new Date(notificationTime).getTime() - new Date().getTime();
  
  if (timeUntilNotification > 0) {
    setTimeout(() => {
      showNotification(content);
    }, timeUntilNotification);
  }
}

export function showNotification(content: string) {
  if (Notification.permission === 'granted') {
    new Notification('Note Reminder', {
      body: content,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      vibrate: [200, 100, 200]
    });
  }
} 