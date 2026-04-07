import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping: short names → full Claude API model strings
const MODEL_MAP: Record<string, string> = {
  "haiku": "claude-haiku-4-5-20251001",
  "sonnet": "claude-sonnet-4-20250514",
  "opus": "claude-opus-4-20250514",
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
        JSON.stringify({
          status: "ok",
          models: Object.keys(MODEL_MAP),
          default: "sonnet",
          provider: "anthropic",
          version: "v2-multi-model"
        }),
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
      console.error("ANTHROPIC_API_KEY is not set in environment variables.");
      return new Response(
        JSON.stringify({ reply: "API key not configured. Please add ANTHROPIC_API_KEY in your project secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Model selection: accept "model" param, default to sonnet for backward compat
    const requestedModel = (body.model || "sonnet").toLowerCase();
    const modelString = MODEL_MAP[requestedModel] || MODEL_MAP["sonnet"];

    // System prompt: accept custom system prompt or use default
    const systemPrompt = body.system || "You are Klyc, an AI marketing strategist. You help users create campaigns, analyze trends, review performance, revise content, and generate learning reports. Be conversational, helpful, and concise.";

    // Max tokens: accept custom or default 1024
    const maxTokens = body.max_tokens || 1024;

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
        model: modelString,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error(`Anthropic API error: ${response.status} - ${errText}`);
      return new Response(
        JSON.stringify({
          reply: `API Error: ${errText}`,
          error: true,
          status: response.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I could not generate a response.";

    return new Response(JSON.stringify({
      reply,
      usage: data.usage,
      model: modelString,
      model_short: requestedModel
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({ reply: "Something went wrong. Please try again.", error: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
