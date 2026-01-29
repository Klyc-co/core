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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received Zapier callback:", JSON.stringify(body));

    const {
      action,
      user_id,
      folder_id,
      folder_url,
      assets_sheet_id,
      assets_sheet_url,
      brand_guidelines_sheet_id,
      brand_guidelines_sheet_url,
      assets, // Array of asset objects for sync
      webhook_url, // The Zapier webhook URL for future syncs
    } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle initial setup - create folder structure and store connection
    if (action === "setup_complete") {
      if (!folder_id) {
        return new Response(
          JSON.stringify({ success: false, error: "folder_id is required for setup" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if connection already exists
      const { data: existing } = await supabase
        .from("google_drive_connections")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existing) {
        // Update existing connection
        const { error: updateError } = await supabase
          .from("google_drive_connections")
          .update({
            folder_id,
            folder_url,
            assets_sheet_id,
            assets_sheet_url,
            brand_guidelines_sheet_id,
            brand_guidelines_sheet_url,
            zapier_webhook_url: webhook_url,
            connection_status: "connected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating connection:", updateError);
          throw updateError;
        }

        console.log("Updated existing Google Drive connection for user:", user_id);
      } else {
        // Create new connection using service role (bypasses RLS)
        const { error: insertError } = await supabase
          .from("google_drive_connections")
          .insert({
            user_id,
            folder_id,
            folder_url,
            assets_sheet_id,
            assets_sheet_url,
            brand_guidelines_sheet_id,
            brand_guidelines_sheet_url,
            zapier_webhook_url: webhook_url,
            connection_status: "connected",
          });

        if (insertError) {
          console.error("Error creating connection:", insertError);
          throw insertError;
        }

        console.log("Created new Google Drive connection for user:", user_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Google Drive connection established" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle asset sync - receive assets from Google Sheets
    if (action === "sync_assets") {
      if (!assets || !Array.isArray(assets)) {
        return new Response(
          JSON.stringify({ success: false, error: "assets array is required for sync" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the connection ID
      const { data: connection, error: connError } = await supabase
        .from("google_drive_connections")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ success: false, error: "No Google Drive connection found for user" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear existing assets and insert new ones
      await supabase
        .from("google_drive_assets")
        .delete()
        .eq("user_id", user_id);

      const assetsToInsert = assets.map((asset: any) => ({
        user_id,
        drive_connection_id: connection.id,
        asset_name: asset.name || asset.asset_name || "Untitled",
        asset_type: asset.type || asset.asset_type,
        drive_file_id: asset.file_id || asset.drive_file_id,
        drive_url: asset.url || asset.drive_url,
        description: asset.description,
        tags: asset.tags ? (Array.isArray(asset.tags) ? asset.tags : asset.tags.split(",").map((t: string) => t.trim())) : null,
        content_extracted: asset.content || asset.content_extracted,
        is_priority: asset.is_priority || asset.priority === "true" || asset.priority === true,
        metadata: asset.metadata || {},
        synced_at: new Date().toISOString(),
      }));

      if (assetsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("google_drive_assets")
          .insert(assetsToInsert);

        if (insertError) {
          console.error("Error inserting assets:", insertError);
          throw insertError;
        }
      }

      // Update last sync time
      await supabase
        .from("google_drive_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);

      console.log(`Synced ${assetsToInsert.length} assets for user:`, user_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Synced ${assetsToInsert.length} assets`,
          count: assetsToInsert.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle disconnect
    if (action === "disconnect") {
      await supabase
        .from("google_drive_connections")
        .delete()
        .eq("user_id", user_id);

      console.log("Disconnected Google Drive for user:", user_id);

      return new Response(
        JSON.stringify({ success: true, message: "Google Drive disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action. Use: setup_complete, sync_assets, or disconnect" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in google-drive-zapier-callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
