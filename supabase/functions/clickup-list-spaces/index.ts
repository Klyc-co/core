import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKETING_KEYWORDS = [
  "marketing", "campaign", "content", "social", "calendar",
  "launch", "creative", "brand", "ads", "newsletter",
  "brief", "strategy", "notes",
];

function isMarketingSuggested(name: string, spaceName?: string, folderName?: string): boolean {
  const combined = `${name} ${spaceName || ""} ${folderName || ""}`.toLowerCase();
  return MARKETING_KEYWORDS.some(k => combined.includes(k));
}

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

    const { data: conn } = await supabase
      .from("clickup_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("connection_status", "active")
      .maybeSingle();

    if (!conn) throw new Error("No active ClickUp connection");

    const apiToken = conn.api_token;
    const teamId = conn.team_id;

    if (!teamId) throw new Error("No team ID found");

    const headers = { Authorization: apiToken };

    // Fetch spaces
    const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space?archived=false`, { headers });
    const spacesData = await spacesRes.json();
    const spaces = spacesData.spaces || [];

    const allLists: any[] = [];

    for (const space of spaces) {
      // Get folderless lists
      const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list?archived=false`, { headers });
      const listsData = await listsRes.json();
      for (const list of listsData.lists || []) {
        allLists.push({
          clickup_list_id: list.id,
          name: list.name,
          space_name: space.name,
          folder_name: null,
          task_count: list.task_count || 0,
          is_marketing_suggested: isMarketingSuggested(list.name, space.name),
        });
      }

      // Get folders and their lists
      const foldersRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder?archived=false`, { headers });
      const foldersData = await foldersRes.json();
      for (const folder of foldersData.folders || []) {
        for (const list of folder.lists || []) {
          allLists.push({
            clickup_list_id: list.id,
            name: list.name,
            space_name: space.name,
            folder_name: folder.name,
            task_count: list.task_count || 0,
            is_marketing_suggested: isMarketingSuggested(list.name, space.name, folder.name),
          });
        }
      }
    }

    // Upsert lists into DB
    for (const list of allLists) {
      const { data: existing } = await supabase
        .from("clickup_lists")
        .select("id, is_selected_for_sync")
        .eq("connection_id", conn.id)
        .eq("clickup_list_id", list.clickup_list_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("clickup_lists")
          .update({
            name: list.name,
            space_name: list.space_name,
            folder_name: list.folder_name,
            is_marketing_suggested: list.is_marketing_suggested,
            task_count: list.task_count,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("clickup_lists").insert({
          user_id: user.id,
          connection_id: conn.id,
          clickup_list_id: list.clickup_list_id,
          name: list.name,
          space_name: list.space_name,
          folder_name: list.folder_name,
          is_marketing_suggested: list.is_marketing_suggested,
          task_count: list.task_count,
        });
      }
    }

    // Fetch updated lists from DB
    const { data: dbLists } = await supabase
      .from("clickup_lists")
      .select("*")
      .eq("connection_id", conn.id)
      .order("space_name")
      .order("folder_name")
      .order("name");

    return new Response(JSON.stringify({
      spaces: spaces.map((s: any) => ({ id: s.id, name: s.name })),
      lists: dbLists || [],
      teamName: conn.team_name,
      userEmail: conn.user_email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
