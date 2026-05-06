import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a campaign strategist AI. Given a business profile and recent post history, generate a targeted, specific campaign brief.

Output ONLY a JSON object with exactly these fields:
{
  "campaign_name": "short memorable campaign name",
  "theme": "central campaign theme in one sentence",
  "goal": "primary goal: awareness|engagement|conversion|retention",
  "target_audience": "specific audience segment description",
  "platforms": ["array of platforms from: instagram|linkedin|twitter|tiktok|youtube"],
  "posts_per_week": 3,
  "duration_days": 14,
  "key_messages": ["message 1", "message 2", "message 3"],
  "content_angles": ["angle 1 — post idea", "angle 2 — post idea", "angle 3 — post idea"],
  "cta": "primary call to action",
  "why_now": "one sentence on why this campaign makes sense right now"
}

Be specific, actionable, and based on the provided business context. No generic advice.`;

async function logAiActivity(
  svc: any,
  functionName: string,
  modelUsed: string,
  tokensIn: number | null,
  tokensOut: number | null,
  userId?: string,
): Promise<void> {
  try {
    const totalTokens = (tokensIn ?? 0) + (tokensOut ?? 0);
    // Haiku pricing: $0.80/MTok input, $4.00/MTok output
    const costEstimate = ((tokensIn ?? 0) * 0.0000008) + ((tokensOut ?? 0) * 0.000004);
    await svc.from("ai_activity_log").insert({
      function_name: functionName,
      model_used: modelUsed,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      total_tokens: totalTokens,
      cost_estimate: costEstimate,
      ...(userId ? { user_id: userId } : {}),
    });
  } catch (_) { /* non-blocking */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(supabaseUrl, serviceKey);

    // Fetch profile first to get client_id
    const { data: profile } = await svc.from("client_profiles")
      .select("id, business_name, description, industry, target_audience, value_proposition, marketing_goals, product_category, website")
      .eq("user_id", user.id).maybeSingle();

    const clientId = profile?.id || null;

    // Fetch recent scheduled_posts by client_id (correct table + column)
    const { data: posts } = clientId
      ? await svc.from("scheduled_posts")
          .select("content_payload, platform, scheduled_for")
          .eq("client_id", clientId)
          .order("scheduled_for", { ascending: false }).limit(10)
      : { data: [] as any[] };

    const profileCtx = profile
      ? `Business: ${profile.business_name || "Unknown"}\nDescription: ${profile.description || "None"}\nIndustry: ${profile.industry || "Unknown"}\nAudience: ${profile.target_audience || "Not set"}\nValue prop: ${profile.value_proposition || "Not set"}\nGoals: ${profile.marketing_goals || "Not set"}`
      : "No profile set up yet.";

    const postCtx = posts && posts.length > 0
      ? `Recent content (${posts.length} posts):\n${posts.map((p, i) => `${i + 1}. [${p.platform}] ${((p.content_payload?.post_text || p.content_payload?.topic) || "").slice(0, 120)}`).join("\n")}`
      : "No posts yet — this is a fresh start.";

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${profileCtx}\n\n${postCtx}\n\nGenerate a campaign brief.` }],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI ${aiResp.status}`);
    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "{}";

    // Log token usage
    const tokensIn = aiData.usage?.input_tokens ?? null;
    const tokensOut = aiData.usage?.output_tokens ?? null;
    logAiActivity(svc, "campaign-brief-ai", "claude-haiku-4-5-20251001", tokensIn, tokensOut, user.id);

    let brief: Record<string, any> = {};
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      brief = JSON.parse(match ? match[0] : rawText);
    } catch {
      brief = { campaign_name: "New Campaign", theme: "Brand awareness", goal: "awareness", platforms: ["instagram", "linkedin"], posts_per_week: 3, duration_days: 14, key_messages: [], content_angles: [], cta: "Learn more", why_now: "Now is a great time to grow your audience." };
    }

    // Build a human-readable brief summary for the prompt field
    const keyMsgs = (brief.key_messages || []).map((m: string) => `• ${m}`).join("\n");
    const angles = (brief.content_angles || []).map((a: string) => `• ${a}`).join("\n");
    const platforms = (brief.platforms || []).join(", ");
    const readableBrief = [
      `CAMPAIGN: ${brief.campaign_name || ""}`,
      `THEME: ${brief.theme || ""}`,
      `PLATFORMS: ${platforms} | ${brief.posts_per_week || 3}x/week for ${brief.duration_days || 14} days`,
      `CTA: ${brief.cta || ""}`,
      ``,
      `KEY MESSAGES:`,
      keyMsgs,
      ``,
      `CONTENT ANGLES:`,
      angles,
      ``,
      `WHY NOW: ${brief.why_now || ""}`,
    ].join("\n");

    // Store using actual campaign_drafts schema — all human-readable text
    const { data: draft } = await svc.from("campaign_drafts").insert({
      user_id: user.id,
      campaign_idea: brief.campaign_name || "New Campaign",
      campaign_objective: brief.theme || "",
      campaign_goals: brief.goal || "awareness",
      target_audience: brief.target_audience || "",
      target_audience_description: brief.target_audience || "",
      prompt: readableBrief,
    }).select("id").maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      brief,
      draft_id: draft?.id || null,
      postsAnalyzed: posts?.length || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("campaign-brief-ai:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
