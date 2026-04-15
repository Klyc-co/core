const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Threads uses the same Meta/Instagram app credentials
    const clientId = Deno.env.get('INSTAGRAM_CLIENT_ID')
    if (!clientId) {
      throw new Error('INSTAGRAM_CLIENT_ID not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const redirectUri = `${supabaseUrl}/functions/v1/threads-auth-callback`

    // Threads API OAuth URL
    const scopes = [
      'threads_basic',
      'threads_content_publish',
      'threads_manage_insights',
      'threads_manage_replies',
    ].join(',')

    const authUrl = `https://threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`

    return new Response(JSON.stringify({ authUrl }), {
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
