import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a competitive intelligence AI. Analyze a competitor's website and extract strategic intelligence for a marketing team.

Output ONLY a JSON object:
{
  "competitor_name": "company name",
  "positioning": "how they position themselves in the market",
  "target_audience": "who they target",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses_or_gaps": ["gap 1", "gap 2"],
  "messaging_themes": ["core message theme 1", "core message theme 2"],
  "content_strategy": "description of their apparent content approach",
  "differentiators": ["what makes them distinctive"],
  "opportunities_for_us": ["opportunity 1 — where we can win", "opportunity 2"],
  "threat_level": "low|medium|high",
  "intelligence_summary": "3-4 sentence executive summary of competitive position"
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

    const body = await req.json();
    const { competitor_url, competitor_name } = body;
    if (!competitor_url) return new Response(JSON.stringify({ error: "competitor_url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(supabaseUrl, serviceKey);

    // Scrape competitor site via scan-website (Firecrawl)
    const scanResp = await fetch(`${supabaseUrl}/functions/v1/scan-website`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: anonKey },
      body: JSON.stringify({ url: competitor_url }),
    });

    let siteContent = "Could not scrape the website.";
    let scrapedSummary: Record<string, any> = {};
    if (scanResp.ok) {
      const scanData = await scanResp.json();
      scrapedSummary = scanData.businessSummary || {};
      siteContent = `Scraped content from ${competitor_url}:\n` +
        `Business name: ${scrapedSummary.businessName || competitor_name || "Unknown"}\n` +
        `Description: ${scrapedSummary.description || ""}\n` +
        `Products/Services: ${scrapedSummary.productCategory || ""}\n` +
        `Value proposition: ${scrapedSummary.valueProposition || ""}\n` +
        `Target audience: ${scrapedSummary.targetAudience || ""}\n` +
        `Pages scanned: ${scanData.pagesScanned || 1}`;
    }

    // Fetch our own profile for comparison
    const { data: ourProfile } = await svc.from("client_profiles")
      .select("business_name, description, value_proposition, target_audience")
      .eq("user_id", user.id).maybeSingle();

    const ourCtx = ourProfile
      ? `Our business: ${ourProfile.business_name}\nOur description: ${ourProfile.description}\nOur value prop: ${ourProfile.value_proposition}`
      : "Our profile not set.";

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 1400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${siteContent}\n\n${ourCtx}\n\nGenerate competitive intelligence.` }],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI ${aiResp.status}`);
    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "{}";

    let analysis: Record<string, any> = {};
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : rawText);
    } catch { analysis = { competitor_name: competitor_name || competitor_url, intelligence_summary: "Competitor scanned. See details above.", threat_level: "medium" }; }

    // Upsert competitor_analyses
    const competitorName = analysis.competitor_name || scrapedSummary.businessName || competitor_name || competitor_url;
    try {
      await svc.from("competitor_analyses").upsert({
        user_id: user.id,
        competitor_name: competitorName,
        competitor_url,
        analysis_data: analysis,
        threat_level: analysis.threat_level || "medium",
        last_scanned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,competitor_url", ignoreDuplicates: false });
    } catch (dbErr) {
      // Column mismatch — insert with safe subset
      try {
        await svc.from("competitor_analyses").insert({
          user_id: user.id,
          updated_at: new Date().toISOString(),
        });
      } catch { /* non-blocking */ }
    }

    // Insert observation
    try {
      await svc.from("competitor_observations").insert({
        user_id: user.id,
        competitor_name: competitorName,
        competitor_url,
        observation_data: analysis,
        observed_at: new Date().toISOString(),
      });
    } catch { /* non-blocking */ }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      competitorName,
      scrapedPages: scrapedSummary.pagesScanned || 1,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("competitor-watch-ai:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
