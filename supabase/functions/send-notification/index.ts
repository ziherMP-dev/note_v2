import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as webPush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription, message } = await req.json()
    
    webPush.setVapidDetails(
      'mailto:your-email@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') || '',
      Deno.env.get('VAPID_PRIVATE_KEY') || ''
    )

    await webPush.sendNotification(subscription, message)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 