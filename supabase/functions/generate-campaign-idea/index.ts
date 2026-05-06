import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[generate-campaign-idea] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { contentType, targetAudience, prompt, productInfo } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      console.error("[generate-campaign-idea] ANTHROPIC_API_KEY not set");
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("[generate-campaign-idea] Generating idea for contentType:", contentType, "user:", user.id);

    const systemPrompt = `You are an expert marketing strategist and campaign creator. Generate creative, actionable campaign ideas based on the user's input.

You must also provide 3 sample campaigns that have performed well for similar products or industries. These should be real-world inspired examples with concrete metrics.

Always respond with valid JSON in the exact format specified. Do not include any markdown formatting or code blocks. Return ONLY the JSON object — no prose, no explanation, no fences.`;

    let userPrompt = `Generate a campaign idea for the following:
- Content Type: ${contentType}
- Target Audience: ${targetAudience || "General audience"}
${prompt ? `- Additional Details: ${prompt}` : ""}
${productInfo ? `- Product Info: ${productInfo}` : ""}

`;

    if (contentType === "social-video" || contentType === "video-ad") {
      userPrompt += `
Respond with this exact JSON structure:
{
  "campaignIdea": "A compelling campaign idea title",
  "videoScript": "Scene 1: [description]\\nScene 2: [description]\\nScene 3: [description]\\nScene 4: [description]",
  "scenePrompts": [
    { "time": "[0-2s]", "title": "Hook - Attention-grabbing opening", "prompt": "Detailed visual prompt for this scene" },
    { "time": "[2-6s]", "title": "Problem - Show common pain point", "prompt": "Detailed visual prompt for this scene" },
    { "time": "[6-12s]", "title": "Solution - Introduce product", "prompt": "Detailed visual prompt for this scene" },
    { "time": "[12-15s]", "title": "CTA - Call to action", "prompt": "Detailed visual prompt for this scene" }
  ],
  "campaignGoals": "Goal 1\\nGoal 2\\nGoal 3\\nGoal 4",
  "targetAudienceDescription": "Detailed target audience description",
  "campaignObjective": "Clear campaign objective statement",
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "sampleCampaigns": [
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved (e.g. 2.5M views, 12% engagement rate)", "whyItWorked": "Brief explanation of success factors" },
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" },
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" }
  ]
}`;
    } else if (contentType === "visual-post") {
      userPrompt += `
Respond with this exact JSON structure:
{
  "campaignIdea": "A compelling campaign idea title",
  "postCaption": "Engaging social media caption with emojis and hashtags",
  "imagePrompt": "Detailed AI image generation prompt describing the visual style, composition, colors, and elements",
  "campaignGoals": "Goal 1\\nGoal 2\\nGoal 3\\nGoal 4",
  "targetAudienceDescription": "Detailed target audience description",
  "campaignObjective": "Clear campaign objective statement",
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "sampleCampaigns": [
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" },
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" },
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" }
  ]
}`;
    } else if (contentType === "written") {
      userPrompt += `
Respond with this exact JSON structure:
{
  "campaignIdea": "A compelling campaign idea title",
  "articleOutline": "I. Introduction\\n  - Hook\\n  - Thesis\\n\\nII. Main Point 1\\n  - Supporting detail\\n  - Example\\n\\nIII. Main Point 2\\n  - Supporting detail\\n  - Example\\n\\nIV. Conclusion\\n  - Summary\\n  - Call to action",
  "campaignGoals": "Goal 1\\nGoal 2\\nGoal 3\\nGoal 4",
  "targetAudienceDescription": "Detailed target audience description",
  "campaignObjective": "Clear campaign objective statement",
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "sampleCampaigns": [
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" },
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" },
    { "brand": "Brand name", "campaign": "Campaign title", "platform": "Platform used", "result": "Key metric achieved", "whyItWorked": "Brief explanation" }
  ]
}`;
    }

    // Call Anthropic /v1/messages with Haiku 4.5. Same JSON-asking prompt as before; we
    // parse the text response the same way we did for Lovable's chat-completion shape.
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3072,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "<no body>");
      console.error("[generate-campaign-idea] Anthropic error:", response.status, errorText.slice(0, 500));

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    // Anthropic returns { content: [{ type: "text", text: "..." }, ...] }
    const textBlock = (data.content || []).find((b: any) => b.type === "text");
    const content = textBlock?.text ?? "";

    console.log("[generate-campaign-idea] Raw AI response (first 400 chars):", content.slice(0, 400));

    let result;
    try {
      let cleanContent = (content || "").trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[generate-campaign-idea] Failed to parse AI response:", parseError);
      console.error("[generate-campaign-idea] Content was:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[generate-campaign-idea] Top-level error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
