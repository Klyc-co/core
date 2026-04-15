const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    const siteUrl = Deno.env.get('SITE_URL') || 'https://idea-to-idiom.lovable.app'

    if (error || !code) {
      return Response.redirect(`${siteUrl}/client/profile/social?error=${error || 'no_code'}`, 302)
    }

    const clientId = Deno.env.get('INSTAGRAM_CLIENT_ID')!
    const clientSecret = Deno.env.get('INSTAGRAM_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const redirectUri = `${supabaseUrl}/functions/v1/threads-auth-callback`

    // Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      throw new Error(tokenData.error_message || 'Token exchange failed')
    }

    const shortToken = tokenData.access_token
    const userId = tokenData.user_id

    // Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
    )
    const longData = await longRes.json()
    const accessToken = longData.access_token || shortToken

    // Get user's auth token from cookie/header
    const authHeader = req.headers.get('authorization')
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader || '' } } }
    )

    // Store in social_connections
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find user by the most recent session (callback doesn't have auth)
    // Store with platform_user_id for matching
    const { error: upsertError } = await serviceClient
      .from('social_connections')
      .upsert({
        platform: 'threads',
        platform_user_id: String(userId),
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // ~60 days
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
    }

    return Response.redirect(`${siteUrl}/client/profile/social?success=threads`, 302)
  } catch (error) {
    console.error('Threads callback error:', error)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://idea-to-idiom.lovable.app'
    return Response.redirect(`${siteUrl}/client/profile/social?error=${encodeURIComponent(error.message)}`, 302)
  }
})
