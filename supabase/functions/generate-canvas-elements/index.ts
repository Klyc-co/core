 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { prompt, canvasWidth, canvasHeight, brandFonts, brandColors } = await req.json();
 
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const systemPrompt = `You are a graphic design assistant that converts natural language descriptions into canvas element instructions for a flyer/image editor.
 
 Available canvas size: ${canvasWidth}x${canvasHeight} pixels
 Available fonts: ${brandFonts?.join(", ") || "Arial, Helvetica, Impact"}
 Available brand colors: ${brandColors?.join(", ") || "#000000, #FFFFFF, #3B82F6"}
 
 Return a JSON object with an "elements" array. Each element can be:
 
 Text element:
 {
   "type": "text",
   "content": "The text to display",
   "left": x position (number),
   "top": y position (number),
   "fontSize": size in pixels (number),
   "fontFamily": "font name",
   "fill": "color hex",
   "bold": true/false,
   "italic": true/false,
   "textAlign": "left" | "center" | "right"
 }
 
 Rectangle element (for backgrounds, banners):
 {
   "type": "rect",
   "left": x position,
   "top": y position,
   "width": width in pixels,
   "height": height in pixels,
   "fill": "color hex",
   "rx": corner radius (optional),
   "ry": corner radius (optional),
   "sendToBack": true/false (optional, for background elements)
 }
 
 Circle element:
 {
   "type": "circle",
   "left": x position,
   "top": y position,
   "radius": radius in pixels,
   "fill": "color hex"
 }
 
 Guidelines:
 - Position elements thoughtfully based on the description (top, center, bottom, etc.)
 - Use brand colors when available
 - For "flyer" style, add bold headlines with large fonts
 - For banners/backgrounds, create rect elements and set sendToBack: true
 - Headlines should be 48-72px, subtext 24-36px, body 16-20px
 - Center important text horizontally (left = canvasWidth/2 - estimated text width/2)
 - Leave margins from edges (at least 20-40px)
 
 ONLY return valid JSON, no markdown or explanation.`;
 
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
           { role: "user", content: prompt },
         ],
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error("AI API error:", response.status, errorText);
       throw new Error(`AI API error: ${response.status}`);
     }
 
     const data = await response.json();
     const content = data.choices?.[0]?.message?.content || "{}";
     
     // Parse the JSON response, handling potential markdown wrapping
     let parsed;
     try {
       // Remove markdown code blocks if present
       const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
       parsed = JSON.parse(cleanContent);
     } catch (parseError) {
       console.error("Failed to parse AI response:", content);
       parsed = { elements: [] };
     }
 
     return new Response(JSON.stringify(parsed), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Error in generate-canvas-elements:", error);
     return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", elements: [] }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });