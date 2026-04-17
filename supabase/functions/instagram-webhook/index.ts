import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET = Meta verification handshake
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN");

    if (!VERIFY_TOKEN) {
      console.error("INSTAGRAM_WEBHOOK_VERIFY_TOKEN not configured");
      return new Response("Server misconfigured", { status: 500 });
    }

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Instagram webhook verified successfully");
      return new Response(challenge ?? "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("Instagram webhook verification failed", { mode, tokenMatches: token === VERIFY_TOKEN });
    return new Response("Forbidden", { status: 403 });
  }

  // POST = actual event payload from Meta
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Instagram webhook event received:", JSON.stringify(body));
      // TODO: route events (comments, mentions, messages, etc.) to handlers
      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (err) {
      console.error("Error processing Instagram webhook event:", err);
      return new Response("Bad Request", { status: 400 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
