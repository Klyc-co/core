import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an audience intelligence AI. Analyze post history and business profile to extract actionable audience insights.

Output ONLY a JSON object:
{
  "primary_audience": "description of the primary audience engaging with this content",
  "audience_size_estimate": "small|growing|established|large",
  "top_content_types": ["what content formats/topics perform best"],
  "best_posting_times": ["day/time recommendations"],
  "audience_interests": ["key interests and topics"],
  "engagement_pattern": "description of how the audience engages",
  "growth_opportunity": "biggest untapped audience segment",
  "recommended_tone": "tone that resonates best with this audience",
  "audience_summary": "2-3 sentence summary suitable for a business profile audience field"
}`;

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

    const [{ data: profile }, { data: posts }, { data: analytics }] = await Promise.all([
      svc.from("client_profiles")
        .select("business_name, description, industry, target_audience, audience_data, product_category")
        .eq("user_id", user.id).maybeSingle(),
      svc.from("post_queue")
        .select("post_text, content_type, platform, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(30),
      svc.from("post_analytics")
        .select("platform, impressions, likes, comments, shares, reach, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20),
    ]);

    const profileCtx = profile
      ? `Business: ${profile.business_name}\nIndustry: ${profile.industry}\nCurrent audience data: ${profile.target_audience || "Not set"}\nProduct: ${profile.product_category || "Unknown"}`
      : "No profile.";

    const postCtx = posts && posts.length > 0
      ? `Post history (${posts.length} posts):\n${posts.map((p, i) => `${i + 1}. [${p.platform || "unknown"}] ${(p.post_text || "").slice(0, 100)}`).join("\n")}`
      : "No posts yet.";

    const analyticsCtx = analytics && analytics.length > 0
      ? `Analytics data (${analytics.length} data points):\n${analytics.map(a => `${a.platform}: ${a.impressions || 0} impressions, ${a.likes || 0} likes, ${a.comments || 0} comments`).join("\n")}`
      : "No analytics data yet — inferring from content patterns.";

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${profileCtx}\n\n${postCtx}\n\n${analyticsCtx}\n\nAnalyze this audience.` }],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI ${aiResp.status}`);
    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "{}";

    let insights: Record<string, any> = {};
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      insights = JSON.parse(match ? match[0] : rawText);
    } catch { insights = { audience_summary: "Analysis complete — see chat for details.", primary_audience: "Your current audience", growth_opportunity: "Expand to new platforms" }; }

    // Update client_profiles with audience intelligence
    const profileUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
    if (insights.audience_summary) profileUpdate.target_audience = insights.audience_summary;
    if (insights.primary_audience || insights.audience_interests) {
      profileUpdate.audience_data = {
        primary_audience: insights.primary_audience,
        interests: insights.audience_interests,
        best_times: insights.best_posting_times,
        engagement_pattern: insights.engagement_pattern,
        growth_opportunity: insights.growth_opportunity,
        analyzed_at: new Date().toISOString(),
      };
    }
    await svc.from("client_profiles").update(profileUpdate).eq("user_id", user.id);

    return new Response(JSON.stringify({
      success: true,
      insights,
      postsAnalyzed: posts?.length || 0,
      analyticsDataPoints: analytics?.length || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("audience-intel-ai:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
