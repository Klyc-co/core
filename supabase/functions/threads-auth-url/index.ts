import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('INSTAGRAM_CLIENT_ID')
    if (!clientId) {
      throw new Error('INSTAGRAM_CLIENT_ID not configured')
    }

    // Get the user to pass their ID via state param
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claimsData.claims.sub as string

    let returnTo = '/campaigns/new'
    try {
      const body = await req.json().catch(() => ({}))
      if (body?.returnTo && typeof body.returnTo === 'string' && body.returnTo.startsWith('/')) {
        returnTo = body.returnTo
      }
    } catch {
      // ignore malformed JSON and fall back to default return path
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const redirectUri = `${supabaseUrl}/functions/v1/threads-auth-callback`

    const scopes = [
      'threads_basic',
      'threads_content_publish',
      'threads_manage_insights',
      'threads_manage_replies',
    ].join(',')

    const state = encodeURIComponent(JSON.stringify({ userId, returnTo }))
    const authUrl = `https://www.threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
