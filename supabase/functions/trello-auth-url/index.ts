import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    const TRELLO_API_KEY = Deno.env.get("TRELLO_API_KEY");
    if (!TRELLO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Trello not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the Origin header to redirect back to wherever the user is testing from
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") ||
      Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") ||
      "https://idea-to-idiom.lovable.app";
    const FRONTEND_URL = origin.replace(/\/$/, "");

    // Trello uses token-based auth redirect. The callback page will capture the token
    // and send it to the trello-oauth-callback edge function.
    const callbackUrl = `${FRONTEND_URL}/trello-callback`;

    const authUrl = new URL("https://trello.com/1/authorize");
    authUrl.searchParams.set("expiration", "never");
    authUrl.searchParams.set("name", "Klyc");
    authUrl.searchParams.set("scope", "read,write");
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("key", TRELLO_API_KEY);
    authUrl.searchParams.set("callback_method", "fragment");
    authUrl.searchParams.set("return_url", callbackUrl);

    // Store user_id in a temporary state so the callback page knows who to associate
    // We'll pass it via the return_url as a query param
    const callbackWithState = `${callbackUrl}?user_id=${userId}`;
    authUrl.searchParams.set("return_url", callbackWithState);

    console.log("Generated Trello auth URL for user:", userId);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Trello auth URL error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
