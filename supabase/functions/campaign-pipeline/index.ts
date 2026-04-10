import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

async function callClaude(system: string, user: string): Promise<{
  text: string;
  tokensIn: number | null;
  tokensOut: number | null;
}> {
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
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || "",
    tokensIn: data.usage?.input_tokens ?? null,
    tokensOut: data.usage?.output_tokens ?? null,
  };
}

async function runPipeline(input: Record<string, any>): Promise<{
  success: boolean;
  stages: Record<string, any>;
  totalTokens: { input: number; output: number };
}> {
  let totalInput = 0;
  let totalOutput = 0;
  const stages: Record<string, any> = {};

  try {
    // Stage 1: Brief Analysis
    const { text: briefAnalysis, tokensIn: bi1, tokensOut: bo1 } = await callClaude(
      "You are analyzing campaign briefs.",
      `Analyze: ${input.brief || "Campaign brief"}`
    );
    if (bi1) totalInput += bi1;
    if (bo1) totalOutput += bo1;
    stages.brief_analysis = briefAnalysis;

    // Stage 2: Audience Segmentation
    const { text: audienceSegmentation, tokensIn: bi2, tokensOut: bo2 } = await callClaude(
      "You are an audience segmentation expert.",
      `Segment audience for: ${input.audience || "General audience"}`
    );
    if (bi2) totalInput += bi2;
    if (bo2) totalOutput += bo2;
    stages.audience_segmentation = audienceSegmentation;

    return {
      success: true,
      stages,
      totalTokens: { input: totalInput, output: totalOutput },
    };
  } catch (e) {
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const pipelineStart = Date.now();

  try {
    const body = await req.json();
    const { action, input } = body;

    if (action === "create") {
      const result = await runPipeline(input);
      const elapsed = Date.now() - pipelineStart;

      await logHealth(
        "campaign-pipeline",
        result.success,
        elapsed,
        result.totalTokens.input,
        result.totalTokens.output
      );

      return new Response(
        JSON.stringify({
          status: result.success ? "complete" : "error",
          ...result,
          elapsed_ms: elapsed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const elapsed = Date.now() - pipelineStart;
    await logHealth("campaign-pipeline", false, elapsed, null, null);
    console.error("Campaign pipeline error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        elapsed_ms: elapsed,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
