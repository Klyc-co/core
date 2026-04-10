import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "text-embedding-004";
const EMBED_DIMS = 768;

async function generateEmbedding(text: string, geminiKey: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embed error ${response.status}: ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  const values = data?.embedding?.values;
  if (!values || values.length !== EMBED_DIMS) throw new Error(`Invalid embedding dimensions: ${values?.length}`);
  return values;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    if (body.action === "health") {
      return new Response(JSON.stringify({ status: "ok", version: "v1", embed_model: EMBED_MODEL }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Batch mode ────────────────────────────────────────────────────────────
    if (Array.isArray(body.items)) {
      const results: any[] = [];
      for (const item of body.items) {
        const embedding = await generateEmbedding((item.content as string).slice(0, 2000), geminiKey);
        const embeddingStr = `[${embedding.join(",")}]`;
        const { data, error } = await supabase.from("klyc_knowledge").insert({
          content: item.content,
          embedding: embeddingStr,
          category: item.category || "general",
          lane_affinity: item.lane_affinity || ["all"],
          metadata: item.metadata || {},
        }).select("id").single();
        results.push({ id: data?.id, content: (item.content as string).slice(0, 60), error: error?.message });
      }
      return new Response(JSON.stringify({ inserted: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Single item ───────────────────────────────────────────────────────────
    const content = body.content as string;
    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedding = await generateEmbedding(content.slice(0, 2000), geminiKey);
    const embeddingStr = `[${embedding.join(",")}]`;

    const { data, error } = await supabase.from("klyc_knowledge").insert({
      content,
      embedding: embeddingStr,
      category: body.category || "general",
      lane_affinity: body.lane_affinity || ["all"],
      metadata: body.metadata || {},
    }).select("id, content, category, lane_affinity, created_at").single();

    if (error) throw new Error(`Insert error: ${error.message}`);

    return new Response(JSON.stringify({ success: true, item: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("knowledge-embed error:", e);
    return new Response(JSON.stringify({ error: e.message || "Embed failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
