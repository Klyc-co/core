 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
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
 
     const { displayName } = await req.json();
 
     const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
     const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-crm-oauth-callback`;
     
     if (!clientId) {
       return new Response(
         JSON.stringify({ error: "HubSpot client ID not configured" }),
         {
           status: 500,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         }
       );
     }
 
     // Store the state with user info for callback
     const state = btoa(JSON.stringify({
       userId: user.id,
       displayName: displayName || "HubSpot",
     }));
 
     const scopes = [
       "crm.objects.contacts.read",
       "crm.objects.companies.read",
       "crm.objects.deals.read",
     ].join(" ");
 
     const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
 
     return new Response(JSON.stringify({ authUrl }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
  } catch (error: unknown) {
     console.error("Error generating HubSpot auth URL:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });