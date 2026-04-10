import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, apiKey, apiToken } = await req.json();

    if (action === "connect") {
      if (!apiKey || !apiToken) {
        return new Response(JSON.stringify({ error: "API key and token are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate the credentials by calling Trello API
      const membersRes = await fetch("https://api.trello.com/1/members/me", {
        headers: {
          Accept: "application/json",
        },
        method: "GET",
        search: `key=${apiKey}&token=${apiToken}`,
      });

      // Try alternate URL format if first fails
      let validRes = membersRes;
      if (!membersRes.ok) {
        validRes = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${apiToken}`, {
          headers: {
            Accept: "application/json",
          },
        });
      }

      if (!validRes.ok) {
        const errText = await validRes.text();
        console.error("Trello validation failed:", errText);
        return new Response(JSON.stringify({ error: "Invalid Trello API credentials. Please check your key and token." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const memberData = await validRes.json();

      // Get board count
      const boardsRes = await fetch(`https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${apiToken}`, {
        headers: {
          Accept: "application/json",
        },
      });

      let boardCount = 0;
      if (boardsRes.ok) {
        const boards = await boardsRes.json();
        boardCount = Array.isArray(boards) ? boards.length : 0;
      }

      // Upsert connection
      const { error: upsertError } = await supabase
        .from("trello_connections")
        .upsert({
          user_id: user.id,
          api_key: apiKey,
          api_token: apiToken,
          member_id: memberData.id,
          display_name: "Trello",
          connection_status: "connected",
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save connection" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, boardCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      await supabase.from("trello_connections").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data: conn } = await supabase
        .from("trello_connections")
        .select("id, connection_status, last_sync_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(JSON.stringify({ connection: conn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Trello connect error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
