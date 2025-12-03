import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentType, targetAudience, prompt, productInfo } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating campaign idea for content type:", contentType);

    let systemPrompt = `You are an expert marketing strategist and campaign creator. Generate creative, actionable campaign ideas based on the user's input.

Always respond with valid JSON in the exact format specified. Do not include any markdown formatting or code blocks.`;

    let userPrompt = `Generate a campaign idea for the following:
- Content Type: ${contentType}
- Target Audience: ${targetAudience || "General audience"}
${prompt ? `- Additional Details: ${prompt}` : ""}
${productInfo ? `- Product Info: ${productInfo}` : ""}

`;

    // Different output format based on content type
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
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
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
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
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
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;
    }

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("Raw AI response:", content);

    // Parse the JSON response
    let result;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
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
      console.error("Failed to parse AI response:", parseError);
      console.error("Content was:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-campaign-idea:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
