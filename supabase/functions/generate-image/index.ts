import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function generateWithNanoBanana(prompt: string, apiKey: string, inspirationImageUrl?: string): Promise<string> {
  console.log("Generating with Nano Banana model...", inspirationImageUrl ? "with inspiration image" : "text-only");
  
  // Build the message content - either text-only or with inspiration image
  let messageContent: any;
  
  if (inspirationImageUrl) {
    // Image-to-image: use inspiration image as reference
    messageContent = [
      {
        type: "text",
        text: `Using this image as style inspiration and reference, create a new high-quality marketing image based on this description: ${prompt}. 
        
Adapt the visual style, color palette, mood, and aesthetic from the reference image while creating something new that matches the prompt. Make it professional, visually appealing, and suitable for social media marketing.`
      },
      {
        type: "image_url",
        image_url: {
          url: inspirationImageUrl
        }
      }
    ];
  } else {
    // Text-to-image: standard generation
    messageContent = `Generate a high-quality marketing image based on this description: ${prompt}. Make it professional, visually appealing, and suitable for social media marketing.`;
  }
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ],
      modalities: ["image", "text"]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Nano Banana error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits to your workspace.");
    }
    throw new Error(`Nano Banana error: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl) {
    console.error("No image in Nano Banana response:", JSON.stringify(data));
    throw new Error("No image was generated. Please try with a different prompt.");
  }

  return imageUrl;
}

async function generateWithRunway(prompt: string, apiKey: string): Promise<string> {
  console.log("Generating with Runway model...");
  
  // Start the image generation task
  const createResponse = await fetch("https://api.dev.runwayml.com/v1/image_to_image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: "gen4_image",
      promptText: prompt,
      ratio: "1:1",
    }),
  });

  if (!createResponse.ok) {
    // Try the text_to_image endpoint instead
    console.log("Trying text_to_image endpoint...");
    
    const textToImageResponse = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen4_image",
        promptText: prompt,
        ratio: "1:1",
      }),
    });

    if (!textToImageResponse.ok) {
      const errorText = await textToImageResponse.text();
      console.error("Runway error:", textToImageResponse.status, errorText);
      
      if (textToImageResponse.status === 401) {
        throw new Error("Invalid Runway API key. Please check your configuration.");
      }
      if (textToImageResponse.status === 429) {
        throw new Error("Runway rate limit exceeded. Please try again later.");
      }
      throw new Error(`Runway error: ${textToImageResponse.status} - ${errorText}`);
    }

    const taskData = await textToImageResponse.json();
    console.log("Runway task created:", taskData);
    
    // Poll for completion
    return await pollRunwayTask(taskData.id, apiKey);
  }

  const taskData = await createResponse.json();
  console.log("Runway task created:", taskData);
  
  // Poll for completion
  return await pollRunwayTask(taskData.id, apiKey);
}

async function pollRunwayTask(taskId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Runway poll error:", statusResponse.status, errorText);
      throw new Error(`Failed to check Runway task status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log("Runway task status:", statusData.status);

    if (statusData.status === "SUCCEEDED") {
      if (statusData.output && statusData.output.length > 0) {
        return statusData.output[0];
      }
      throw new Error("Runway task succeeded but no image was returned.");
    }

    if (statusData.status === "FAILED") {
      throw new Error(statusData.failure || "Runway image generation failed.");
    }

    if (statusData.status === "CANCELLED") {
      throw new Error("Runway image generation was cancelled.");
    }

    // Wait 5 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Runway image generation timed out. Please try again.");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get authenticated user
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
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, model = "nano-banana", inspirationImageUrl } = await req.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For style-transfer model, inspiration image is required
    if (model === "style-transfer" && !inspirationImageUrl) {
      return new Response(JSON.stringify({ error: 'Inspiration image is required for Style Transfer model' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating image for user: ${user.id}, Model: ${model}, Prompt: ${prompt.substring(0, 100)}...`, inspirationImageUrl ? "with inspiration image" : "");

    let imageUrl: string;

    if (model === "runway") {
      const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
      if (!RUNWAY_API_KEY) {
        return new Response(JSON.stringify({ error: "Runway API key is not configured. Please add it in settings." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      imageUrl = await generateWithRunway(prompt, RUNWAY_API_KEY);
    } else if (model === "fooocus") {
      return new Response(JSON.stringify({ error: "Fooocus model is coming soon. Please select another model." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (model === "style-transfer") {
      // Style transfer uses Nano Banana with inspiration image
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }
      imageUrl = await generateWithNanoBanana(prompt, LOVABLE_API_KEY, inspirationImageUrl);
    } else {
      // Default to Nano Banana (text-to-image OR image-to-image when inspirationImageUrl is provided)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }
      imageUrl = await generateWithNanoBanana(prompt, LOVABLE_API_KEY, inspirationImageUrl);
    }

    return new Response(JSON.stringify({ 
      imageUrl,
      model,
      message: `Image generated successfully with ${model}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
