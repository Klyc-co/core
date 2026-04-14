import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { platform, content } = await req.json();

    if (!platform || typeof platform !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'platform' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supportedPlatforms = [
      "linkedin", "twitter", "instagram", "tiktok", "youtube",
      "facebook", "threads", "pinterest",
    ];
    if (!supportedPlatforms.includes(platform.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `Unsupported platform: ${platform}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'content' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user has a connected account for this platform
    const { data: connection } = await supabase
      .from("client_platform_connections")
      .select("id, status")
      .eq("client_id", user.id)
      .eq("platform", platform.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (!connection) {
      return new Response(
        JSON.stringify({ error: `No active connection for ${platform}. Please connect your account first.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MOCK SUCCESS ──
    // TODO: Wire up actual platform API calls here
    console.log(`[post-to-platform] Mock post to ${platform} by user ${user.id}, content length: ${content.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        message: `Content successfully posted to ${platform} (mock)`,
        post_id: crypto.randomUUID(),
        posted_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("post-to-platform error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
