import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Health check
    if (body.action === "health") {
      return new Response(
        JSON.stringify({ status: "ok", model: "claude-sonnet-4-20250514", provider: "anthropic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const message = body.message || "";
    if (!message.trim()) {
      return new Response(
        JSON.stringify({ reply: "Please enter a message." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ reply: "API key not configured. Please add ANTHROPIC_API_KEY in your project secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build messages with optional history
    const messages: Array<{ role: string; content: string }> = [];
    if (Array.isArray(body.history)) {
      for (const msg of body.history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are Klyc, an AI marketing strategist. You help users create campaigns, analyze trends, review performance, revise content, and generate learning reports. Be conversational, helpful, and concise.",
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ reply: "I'm having trouble connecting to the AI service right now. Please try again in a moment." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I could not generate a response.";

    return new Response(JSON.stringify({ reply, usage: data.usage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({ reply: "Something went wrong. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
