import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encryptToken } from '../_shared/encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const state = url.searchParams.get('state') // user_id passed via state param

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

    // Encrypt the token before storage
    const encryptedToken = await encryptToken(accessToken)

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Determine the user_id from the state parameter
    const clientUserId = state

    if (!clientUserId) {
      console.error('No user_id in state parameter — cannot associate Threads connection')
      return Response.redirect(`${siteUrl}/client/profile/social?error=missing_user`, 302)
    }

    // Store in client_platform_connections (the table used by post-to-platform)
    const { error: upsertError } = await serviceClient
      .from('client_platform_connections')
      .upsert({
        client_id: clientUserId,
        platform: 'threads',
        access_token: encryptedToken,
        status: 'active',
        connected_at: new Date().toISOString(),
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'client_id,platform',
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return Response.redirect(`${siteUrl}/client/profile/social?error=save_failed`, 302)
    }

    return Response.redirect(`${siteUrl}/client/profile/social?oauth_success=threads`, 302)
  } catch (err) {
    console.error('Threads callback error:', err)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://idea-to-idiom.lovable.app'
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.redirect(`${siteUrl}/client/profile/social?error=${encodeURIComponent(msg)}`, 302)
  }
})
