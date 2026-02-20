import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, token: trelloToken } = await req.json();

    if (!userId || !trelloToken) {
      return new Response(
        JSON.stringify({ error: "Missing userId or token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TRELLO_API_KEY = Deno.env.get("TRELLO_API_KEY")!;

    // Validate the token by calling Trello API
    const memberRes = await fetch(
      `https://api.trello.com/1/members/me?key=${TRELLO_API_KEY}&token=${trelloToken}`,
      { headers: { Accept: "application/json" } }
    );

    if (!memberRes.ok) {
      const errText = await memberRes.text();
      console.error("Trello token validation failed:", errText);
      return new Response(
        JSON.stringify({ error: "Invalid Trello token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memberData = await memberRes.json();

    // Get board count
    const boardsRes = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${TRELLO_API_KEY}&token=${trelloToken}`,
      { headers: { Accept: "application/json" } }
    );

    let boardCount = 0;
    if (boardsRes.ok) {
      const boards = await boardsRes.json();
      boardCount = Array.isArray(boards) ? boards.length : 0;
    }

    // Store connection using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: upsertError } = await supabase
      .from("trello_connections")
      .upsert({
        user_id: userId,
        api_key: TRELLO_API_KEY,
        api_token: trelloToken,
        member_id: memberData.id,
        display_name: memberData.fullName || "Trello",
        connection_status: "connected",
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Trello connected for user:", userId, "boards:", boardCount);

    return new Response(
      JSON.stringify({ success: true, boardCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Trello callback error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
