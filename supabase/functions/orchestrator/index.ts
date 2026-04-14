import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Klyc, an AI marketing strategist built by Empyrean Analytics. You help users create campaigns, analyze trends, and produce ready-to-publish content.

CONVERSATION RULES:
1. NEVER re-ask a question the user has already answered. Read the full conversation history before responding. If the user already stated their goal, product, audience, platform, or any preference — use it, don't ask again.
2. ALWAYS advance the conversation. Each response must move closer to a deliverable. If you have enough context to produce something, produce it. If you need ONE specific missing piece, ask for that one thing only.
3. When offering choices, make them CONTEXTUAL to what the user just said. Never show the same set of options twice. If the user picked "Build brand awareness" — the next options should be about channels, content types, or timing — not the same top-level goals again.
4. Track these through the conversation and never re-ask once provided:
   - User's product/service/business
   - Their primary goal (awareness, sales, growth, launch, etc.)
   - Target audience
   - Preferred platforms
   - Brand voice/tone
   - Any specific constraints or preferences
5. After 2 exchanges, you should have enough to START producing. Default to action over questions. Show a draft, get feedback, refine. Don't interview endlessly.
6. When the user's profile or onboarding data is available in the message context, USE IT. Don't ask for information that's already been provided through their account setup.

NEVER reference internal system names, protocols, subminds, or technical identifiers in any output. You are Klyc to the user — one unified assistant, not a system of parts.`;

async function logHealth(
  submindId: string,
  success: boolean,
  latencyMs: number,
  tokensIn: number | null = null,
  tokensOut: number | null = null,
): Promise<void> {
  try {
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await _sb.from("submind_health_snapshots").insert({
      submind_id: submindId,
      invocation_count: 1,
      success_count: success ? 1 : 0,
      error_count: success ? 0 : 1,
      avg_latency_ms: latencyMs,
      avg_tokens_in: tokensIn,
      avg_tokens_out: tokensOut,
      window_start: new Date().toISOString(),
    });
  } catch (_) { /* non-blocking */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    let { messages } = body;

    // Support action-based payloads from useKlycOrchestrator hook
    if ((!messages || messages.length === 0) && body.action) {
      const userContent = body.message || body.action || "";
      messages = [{ role: "user", content: userContent }];
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.input_tokens ?? null;
    const tokensOut = data.usage?.output_tokens ?? null;
    const text = data.content?.[0]?.text || "";

    const elapsed = Date.now() - startTime;
    await logHealth("orchestrator", true, elapsed, tokensIn, tokensOut);

    return new Response(JSON.stringify({ response: text, elapsed_ms: elapsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    await logHealth("orchestrator", false, elapsed, null, null);
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        elapsed_ms: elapsed,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
