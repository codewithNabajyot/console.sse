import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const OAUTH_REDIRECT_URI = Deno.env.get('OAUTH_REDIRECT_URI')

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code) {
    return new Response('No code provided', { status: 400 })
  }

  let orgId = '';
  let returnUrl = '/';

  try {
    if (state) {
      const decodedState = decodeURIComponent(state)
      const parsedState = JSON.parse(decodedState)
      orgId = parsedState.org_id
      returnUrl = parsedState.return_url || returnUrl
    }
  } catch (e) {
    console.error('State parse error:', e)
  }

  if (!orgId) {
    return new Response('Invalid state: no organization ID', { status: 400 })
  }

  try {
    // Exchange code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: OAUTH_REDIRECT_URI || '',
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await response.json()
    if (!response.ok) {
      throw new Error('Google Token Exchange Failed: ' + JSON.stringify(tokens))
    }

    const { refresh_token, access_token } = tokens

    // Get user info to show which email is connected
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
    })
    const userinfo = await userinfoResponse.json()

    // Update organization config
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('google_drive_config')
      .eq('id', orgId)
      .single()

    if (fetchError) throw fetchError

    const currentConfig = org?.google_drive_config || {}
    const newConfig = {
      ...currentConfig,
      refresh_token: refresh_token || currentConfig.refresh_token,
      connected_email: userinfo.email || currentConfig.connected_email,
      enabled: true,
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ google_drive_config: newConfig })
      .eq('id', orgId)

    if (updateError) throw updateError

    return new Response(null, {
      status: 302,
      headers: { Location: returnUrl },
    })

  } catch (err: any) {
    console.error('Callback error:', err.message)
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
})
