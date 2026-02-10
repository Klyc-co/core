import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { action, apiToken } = await req.json();

    if (action === "status") {
      const { data: conn } = await supabase
        .from("clickup_connections")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(JSON.stringify({ connection: conn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "connect") {
      if (!apiToken?.trim()) {
        return new Response(JSON.stringify({ error: "API token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token by calling ClickUp user endpoint
      const userRes = await fetch("https://api.clickup.com/api/v2/user", {
        headers: { Authorization: apiToken.trim() },
      });

      if (!userRes.ok) {
        return new Response(JSON.stringify({ error: "Invalid ClickUp API token. Please check and try again." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userData = await userRes.json();
      const clickupUser = userData.user;

      // Get teams
      const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
        headers: { Authorization: apiToken.trim() },
      });
      const teamsData = await teamsRes.json();
      const team = teamsData.teams?.[0];

      // Upsert connection
      const { data: existing } = await supabase
        .from("clickup_connections")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("clickup_connections")
          .update({
            api_token: apiToken.trim(),
            team_id: team?.id?.toString() || null,
            team_name: team?.name || null,
            user_email: clickupUser?.email || null,
            connection_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("clickup_connections").insert({
          user_id: user.id,
          api_token: apiToken.trim(),
          team_id: team?.id?.toString() || null,
          team_name: team?.name || null,
          user_email: clickupUser?.email || null,
          connection_status: "active",
        });
      }

      return new Response(JSON.stringify({
        success: true,
        teamName: team?.name,
        userEmail: clickupUser?.email,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      // Delete all related data
      const { data: conn } = await supabase
        .from("clickup_connections")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (conn) {
        await supabase.from("clickup_attachments").delete().eq("connection_id", conn.id);
        await supabase.from("clickup_tasks").delete().eq("connection_id", conn.id);
        await supabase.from("clickup_lists").delete().eq("connection_id", conn.id);
        await supabase.from("clickup_connections").delete().eq("id", conn.id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_sync_frequency") {
      const { syncFrequency } = await req.json().catch(() => ({}));
      await supabase
        .from("clickup_connections")
        .update({ sync_frequency: syncFrequency || "manual" })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
