import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get connection to revoke token
    const { data: connection } = await supabase
      .from("dropbox_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connection?.access_token) {
      try {
        // Decrypt and revoke the token
        const accessToken = await decryptToken(connection.access_token);

        await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (e) {
        console.log("Could not revoke token:", e);
        // Continue anyway - we'll still delete the connection
      }
    }

    // Delete the connection (assets will cascade delete)
    const { error: deleteError } = await supabase
      .from("dropbox_connections")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error("Failed to disconnect Dropbox");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error disconnecting Dropbox:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
