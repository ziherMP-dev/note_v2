import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveSubscription(subscription: PushSubscription, userId: string) {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      subscription: subscription,
      created_at: new Date().toISOString()
    });

  if (error) throw error;
}

export async function requestNotificationPermission(userId: string) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
    });

    await saveSubscription(subscription, userId);
    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}