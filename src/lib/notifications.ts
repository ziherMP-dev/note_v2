import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      return swRegistration;
    }
    throw new Error('Service Worker not supported');
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

export async function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the push subscription
      const registration = await registerServiceWorker();
      
      // Unsubscribe from any existing subscriptions
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });

      // Store the subscription in user_settings
      const { error } = await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id,
          notifications_enabled: true,
          push_subscription: subscription.toJSON()
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

export async function scheduleNotification(content: string, notificationTime: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the user's push subscription
    const { data: settings } = await supabase
      .from('user_settings')
      .select('push_subscription')
      .eq('user_id', user.id)
      .single();

    if (!settings?.push_subscription) {
      throw new Error('Push subscription not found');
    }

    // Get the access token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error('Authentication required');

    // Call the Edge Function to schedule the notification
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        subscription: settings.push_subscription,
        content,
        notificationTime,
        userId: user.id
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    throw error;
  }
} 