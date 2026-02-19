import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const continuation = url.searchParams.get("continuation") || undefined;
    const query = url.searchParams.get("query") || undefined;

    // Get Canva connection
    const { data: conn, error: connError } = await supabase
      .from("social_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("platform", "canva")
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Canva not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = await decryptToken(conn.access_token);

    // Check if token is expired and refresh
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      const refreshToken = conn.refresh_token ? await decryptToken(conn.refresh_token) : null;
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: "Token expired and no refresh token available. Please reconnect Canva." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientId = Deno.env.get("CANVA_CLIENT_ID")!;
      const clientSecret = Deno.env.get("CANVA_CLIENT_SECRET")!;

      const refreshRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!refreshRes.ok) {
        const errText = await refreshRes.text();
        console.error("Canva token refresh failed:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to refresh Canva token. Please reconnect." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = await refreshRes.json();
      accessToken = tokens.access_token;

      // Update stored token
      const { encryptToken } = await import("../_shared/encryption.ts");
      const encAccessToken = await encryptToken(tokens.access_token);
      const encRefreshToken = tokens.refresh_token
        ? await encryptToken(tokens.refresh_token)
        : conn.refresh_token;

      await supabase
        .from("social_connections")
        .update({
          access_token: encAccessToken,
          refresh_token: encRefreshToken,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : conn.token_expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("platform", "canva");
    }

    if (action === "list") {
      // List designs
      const params = new URLSearchParams();
      if (continuation) params.set("continuation", continuation);
      if (query) params.set("query", query);
      params.set("limit", "25");

      const designsRes = await fetch(
        `https://api.canva.com/rest/v1/designs?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!designsRes.ok) {
        const errText = await designsRes.text();
        console.error("Canva list designs failed:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch designs from Canva" }),
          { status: designsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const designsData = await designsRes.json();
      return new Response(JSON.stringify(designsData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export") {
      // Export a design as PNG
      const { designId } = await req.json();
      if (!designId) {
        return new Response(JSON.stringify({ error: "designId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create export job
      const exportRes = await fetch("https://api.canva.com/rest/v1/exports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          design_id: designId,
          format: { type: "png" },
        }),
      });

      if (!exportRes.ok) {
        const errText = await exportRes.text();
        console.error("Canva export failed:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to start design export" }),
          { status: exportRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const exportData = await exportRes.json();
      const exportId = exportData.job?.id;
      if (!exportId) {
        return new Response(
          JSON.stringify({ error: "No export job ID returned" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Poll for completion (max 30 seconds)
      let result = null;
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const statusRes = await fetch(
          `https://api.canva.com/rest/v1/exports/${exportId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!statusRes.ok) continue;

        const statusData = await statusRes.json();
        if (statusData.job?.status === "success") {
          result = statusData.job;
          break;
        }
        if (statusData.job?.status === "failed") {
          return new Response(
            JSON.stringify({ error: "Design export failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!result) {
        return new Response(
          JSON.stringify({ error: "Export timed out" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ urls: result.urls }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("canva-list-designs error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
