import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon?: string;
  cover?: string;
  created_time: string;
  last_edited_time: string;
  parent_type: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  icon?: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Notion connection
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection, error: connError } = await supabaseService
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "notion")
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Notion not connected", pages: [], databases: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);

    // Fetch all pages the integration has access to
    const searchResponse = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Notion search failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Notion content", pages: [], databases: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    
    const pages: NotionPage[] = [];
    const databases: NotionDatabase[] = [];

    for (const result of searchData.results || []) {
      if (result.object === "page") {
        // Extract title from properties
        let title = "Untitled";
        if (result.properties?.title?.title?.[0]?.plain_text) {
          title = result.properties.title.title[0].plain_text;
        } else if (result.properties?.Name?.title?.[0]?.plain_text) {
          title = result.properties.Name.title[0].plain_text;
        } else {
          // Try to find any title property
          for (const prop of Object.values(result.properties || {})) {
            const p = prop as { type?: string; title?: Array<{ plain_text?: string }> };
            if (p?.type === "title" && p?.title?.[0]?.plain_text) {
              title = p.title[0].plain_text;
              break;
            }
          }
        }

        pages.push({
          id: result.id,
          title,
          url: result.url,
          icon: result.icon?.emoji || result.icon?.external?.url,
          cover: result.cover?.external?.url || result.cover?.file?.url,
          created_time: result.created_time,
          last_edited_time: result.last_edited_time,
          parent_type: result.parent?.type || "unknown",
        });
      } else if (result.object === "database") {
        const title = result.title?.[0]?.plain_text || "Untitled Database";
        
        databases.push({
          id: result.id,
          title,
          url: result.url,
          icon: result.icon?.emoji || result.icon?.external?.url,
          created_time: result.created_time,
          last_edited_time: result.last_edited_time,
          properties: result.properties,
        });
      }
    }

    console.log(`Found ${pages.length} pages and ${databases.length} databases for user ${user.id}`);

    return new Response(
      JSON.stringify({
        pages,
        databases,
        workspace: connection.platform_username,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching Notion content:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        pages: [],
        databases: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
