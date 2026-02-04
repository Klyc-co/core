import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LinkRequest {
  /** Optional; if omitted we use the signed-in user's email */
  email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing backend configuration (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 1) Verify the caller is authenticated
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authed.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2) Determine which email to match
    const body: LinkRequest = await req.json().catch(() => ({} as LinkRequest));
    const email = (body.email ?? user.email ?? "").trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3) Use service role to link any pending invites for this email to the authenticated user's ID
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Only link rows where:
    // - client_email matches
    // - marketer_id is not the same as this user (avoid self-link)
    // - client_id is not already this user's id
    const { data: candidates, error: listError } = await admin
      .from("marketer_clients")
      .select("id, marketer_id, client_id, client_email")
      .ilike("client_email", email);

    if (listError) throw listError;

    const linkable = (candidates ?? []).filter(
      (r) => r.marketer_id !== user.id && r.client_id !== user.id
    );

    let updated = 0;
    for (const row of linkable) {
      const { error: updateError } = await admin
        .from("marketer_clients")
        .update({ client_id: user.id })
        .eq("id", row.id);
      if (updateError) throw updateError;
      updated++;
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in link-client-to-marketer:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
