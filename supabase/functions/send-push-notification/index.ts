/// <reference types="https://deno.land/x/webpush/mod.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "https://deno.land/x/webpush/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface RequestBody {
  subscription: PushSubscription;
  content: string;
  userId: string;
  notificationTime?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  try {
    const { subscription, content, userId, notificationTime }: RequestBody = await req.json();

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.id !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // If notificationTime is provided, check if it's time to send the notification
    if (notificationTime) {
      const scheduledTime = new Date(notificationTime).getTime();
      const currentTime = new Date().getTime();
      
      if (scheduledTime > currentTime) {
        return new Response(JSON.stringify({ message: 'Notification scheduled' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // Send push notification
    await webpush.sendNotification(subscription, JSON.stringify({
      title: 'Note Reminder',
      body: content,
      icon: '/icon-512.png',
      data: {
        url: '/' // URL to open when notification is clicked
      }
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 