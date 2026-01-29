import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is called when a client clicks "Connect Google Drive"
// It creates a pending connection and returns the callback URL for Zapier
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;
    const userEmail = claims.claims.email;

    // Check if user already has a connection
    const { data: existing } = await supabase
      .from("google_drive_connections")
      .select("id, connection_status, folder_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing && existing.connection_status === "connected") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          already_connected: true,
          folder_url: existing.folder_url,
          message: "Google Drive already connected" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the callback URL that Zapier will use
    const callbackUrl = `${supabaseUrl}/functions/v1/google-drive-zapier-callback`;

    // Return info for the client to display in the connect flow
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        user_email: userEmail,
        callback_url: callbackUrl,
        instructions: {
          step1: "Create a Zap that triggers on 'Catch Hook'",
          step2: "Add Google Drive actions to create folder structure",
          step3: "Add Google Sheets actions to create asset tracking sheets",
          step4: `POST the results to: ${callbackUrl}`,
          required_payload: {
            action: "setup_complete",
            user_id: userId,
            folder_id: "GOOGLE_DRIVE_FOLDER_ID",
            folder_url: "GOOGLE_DRIVE_FOLDER_URL",
            assets_sheet_id: "GOOGLE_SHEETS_ID",
            assets_sheet_url: "GOOGLE_SHEETS_URL",
            brand_guidelines_sheet_id: "OPTIONAL_SHEET_ID",
            brand_guidelines_sheet_url: "OPTIONAL_SHEET_URL",
            webhook_url: "YOUR_ZAPIER_WEBHOOK_FOR_FUTURE_SYNCS",
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in google-drive-init:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
