import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { displayName, applicationId } = body;

    // Use provided token or fall back to stored secret
    const accessToken = body.accessToken || Deno.env.get("SQUARE_ACCESS_TOKEN");
    const storedAppId = Deno.env.get("SQUARE_APPLICATION_ID");

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Access token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect sandbox vs production token
    // Sandbox access tokens contain "sandbox" or start with "EAAASEAAAA" (sandbox pattern)
    const isSandbox = accessToken.includes("sandbox") || accessToken.startsWith("EAAASEAAAA");
    const baseUrl = isSandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

    console.log(`Using Square ${isSandbox ? "sandbox" : "production"} endpoint`);

    // Verify the token works by fetching merchant info
    const merchantResponse = await fetch(`${baseUrl}/v2/merchants/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18",
        "Content-Type": "application/json",
      },
    });

    if (!merchantResponse.ok) {
      const errData = await merchantResponse.json();
      console.error("Square merchant fetch failed:", JSON.stringify(errData));
      // If production fails and we haven't tried sandbox yet, try sandbox
      if (!isSandbox) {
        const sandboxResponse = await fetch("https://connect.squareupsandbox.com/v2/merchants/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Square-Version": "2024-01-18",
            "Content-Type": "application/json",
          },
        });
        if (!sandboxResponse.ok) {
          const sandboxErr = await sandboxResponse.json();
          return new Response(
            JSON.stringify({ error: `Invalid Square access token: ${sandboxErr?.errors?.[0]?.detail || errData?.errors?.[0]?.detail || "Unauthorized"}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Sandbox worked — use sandbox merchant data
        const sandboxData = await sandboxResponse.json();
        const merchant = sandboxData.merchant;
        const encryptedToken = await encryptToken(accessToken);
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const { data: connection, error: connError } = await supabaseAdmin
          .from("crm_connections")
          .upsert(
            {
              user_id: user.id,
              provider: "square",
              display_name: displayName || "Square (Sandbox)",
              access_token: encryptedToken,
              status: "connected",
              metadata: {
                merchant_id: merchant?.id,
                business_name: merchant?.business_name,
                country: merchant?.country,
                currency: merchant?.currency,
                application_id: applicationId || storedAppId || null,
                environment: "sandbox",
              },
            },
            { onConflict: "user_id,provider" }
          )
          .select()
          .single();
        if (connError) throw connError;
        return new Response(
          JSON.stringify({ success: true, connectionId: connection.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Invalid Square access token: ${errData?.errors?.[0]?.detail || "Unauthorized"}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantData = await merchantResponse.json();
    const merchant = merchantData.merchant;

    // Encrypt the token before storing
    const encryptedToken = await encryptToken(accessToken);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Upsert the CRM connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("crm_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "square",
          display_name: displayName || "Square",
          access_token: encryptedToken,
          status: "connected",
          metadata: {
            merchant_id: merchant?.id,
            business_name: merchant?.business_name,
            country: merchant?.country,
            currency: merchant?.currency,
            application_id: applicationId || storedAppId || null,
          },
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single();

    if (connError) {
      throw connError;
    }

    return new Response(
      JSON.stringify({ success: true, connectionId: connection.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error connecting Square:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
