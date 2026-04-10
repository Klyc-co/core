import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignIdea, targetAudience, contentType, tags } = await req.json();

    if (!campaignIdea) {
      return new Response(
        JSON.stringify({ error: "Campaign idea is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a social media marketing expert. Generate engaging, platform-specific captions for social media posts.

For each platform, create a caption that:
- Matches the platform's tone and style
- Uses appropriate length (TikTok: punchy and short, Instagram: medium with emojis, LinkedIn: professional and longer, Twitter/X: concise under 280 chars)
- Includes relevant hashtags naturally integrated or at the end
- Is optimized for engagement on that specific platform

Return your response as valid JSON with this exact structure:
{
  "tiktok": {
    "caption": "The caption text with hashtags",
    "hashtags": ["#tag1", "#tag2"]
  },
  "instagram": {
    "caption": "The caption text with hashtags",
    "hashtags": ["#tag1", "#tag2"]
  },
  "linkedin": {
    "caption": "The caption text",
    "hashtags": ["#tag1", "#tag2"]
  },
  "twitter": {
    "caption": "The caption text with hashtags (under 280 chars)",
    "hashtags": ["#tag1", "#tag2"]
  }
}`;

    const userPrompt = `Generate platform-specific captions for this campaign:

Campaign Idea: ${campaignIdea}
Target Audience: ${targetAudience || "General audience"}
Content Type: ${contentType || "Social content"}
Existing Tags: ${tags?.join(", ") || "None"}

Create engaging captions optimized for TikTok, Instagram, LinkedIn, and Twitter/X.`;

    console.log("Generating captions for campaign:", campaignIdea);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("AI response:", content);

    // Parse the JSON response from the AI
    let captions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonString = jsonMatch[1].trim();
      captions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback: try to extract content directly
      captions = {
        tiktok: { caption: content, hashtags: [] },
        instagram: { caption: content, hashtags: [] },
        linkedin: { caption: content, hashtags: [] },
        twitter: { caption: content, hashtags: [] },
      };
    }

    return new Response(
      JSON.stringify({ captions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating captions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
