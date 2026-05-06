import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a content calendar AI. Given a business profile, existing schedule gaps, and recent content history, generate a week of posts.

Output ONLY a JSON array of post objects:
[
  {
    "day_offset": 0,
    "platform": "instagram|linkedin|twitter|tiktok",
    "post_text": "full post text ready to publish",
    "content_type": "image|video|carousel|text",
    "posting_time": "HH:MM",
    "topic": "brief topic label"
  }
]

Rules:
- Generate 5-7 posts spread across the week
- Vary platforms and content types
- Each post must be complete and ready to publish — not a template
- Match the brand voice from the profile
- day_offset: 0=today, 1=tomorrow, 2=day after, etc.`;

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
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [{ data: profile }, { data: existingPosts }, { data: recentPosts }] = await Promise.all([
      svc.from("client_profiles")
        .select("id, business_name, description, industry, target_audience, value_proposition, product_category")
        .eq("user_id", user.id).maybeSingle(),
      svc.from("scheduled_posts")
        .select("scheduled_for, content_payload, platform")
        .eq("client_id", (await svc.from("client_profiles").select("id").eq("user_id", user.id).maybeSingle()).data?.id || "")
        .gte("scheduled_for", now.toISOString())
        .lte("scheduled_for", weekEnd.toISOString()),
      svc.from("post_queue")
        .select("post_text, content_type, platform")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(5),
    ]);

    const clientId = profile?.id || null;
    if (!clientId) {
      return new Response(JSON.stringify({ success: false, error: "No client profile found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileCtx = profile
      ? `Business: ${profile.business_name}\nDescription: ${profile.description || "None"}\nIndustry: ${profile.industry || "Unknown"}\nAudience: ${profile.target_audience || "Not set"}\nValue prop: ${profile.value_proposition || "Not set"}`
      : "No profile yet.";

    const existingCtx = existingPosts && existingPosts.length > 0
      ? `Already scheduled this week (${existingPosts.length} posts) — avoid duplicating these topics:\n${existingPosts.map(p => `- ${p.scheduled_for} [${p.platform}]: ${JSON.stringify(p.content_payload).slice(0, 60)}`).join("\n")}`
      : "No posts scheduled yet this week — fill the entire week.";

    const recentCtx = recentPosts && recentPosts.length > 0
      ? `Recent content (avoid repeating):\n${recentPosts.map(p => `- [${p.platform}] ${(p.post_text || "").slice(0, 60)}`).join("\n")}`
      : "";

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${profileCtx}\n\n${existingCtx}\n\n${recentCtx}\n\nGenerate posts to fill the calendar.` }],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI ${aiResp.status}`);
    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "[]";

    let posts: any[] = [];
    try {
      const match = rawText.match(/\[[\s\S]*\]/);
      posts = JSON.parse(match ? match[0] : rawText);
    } catch { posts = []; }

    // Insert posts using actual scheduled_posts schema
    const createdPosts: any[] = [];
    for (const post of posts) {
      try {
        const scheduledFor = new Date(now.getTime() + (post.day_offset || 0) * 24 * 60 * 60 * 1000);
        const [hours, mins] = (post.posting_time || "10:00").split(":").map(Number);
        scheduledFor.setHours(hours || 10, mins || 0, 0, 0);

        const { data: inserted } = await svc.from("scheduled_posts").insert({
          client_id: clientId,
          platform: post.platform || "instagram",
          content_payload: {
            post_text: post.post_text || "",
            content_type: post.content_type || "text",
            topic: post.topic || "",
          },
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
        }).select("id, scheduled_for, platform").maybeSingle();

        if (inserted) createdPosts.push({ ...post, id: inserted.id, scheduled_for: inserted.scheduled_for });
      } catch (insertErr) {
        console.error("Insert failed:", insertErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      postsCreated: createdPosts.length,
      schedule: createdPosts,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("calendar-fill-ai:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
