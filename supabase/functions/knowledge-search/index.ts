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
  if (!values || values.length !== EMBED_DIMS) {
    throw new Error(`Invalid embedding: expected ${EMBED_DIMS} dims, got ${values?.length}`);
  }
  return values;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    if (body.action === "health") {
      return new Response(JSON.stringify({
        status: "ok", version: "v3", embed_model: EMBED_MODEL, embed_dims: EMBED_DIMS,
        api_version: "v1beta", timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const query = body.query as string;
    const lane = body.lane as string | undefined;
    const limit = (body.limit as number) || 5;
    const threshold = (body.threshold as number) || 0.4;

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const embedding = await generateEmbedding(query.slice(0, 1500), geminiKey);
    const embeddingStr = `[${embedding.join(",")}]`;

    const { data, error } = await supabase.rpc("search_knowledge", {
      query_embedding: embeddingStr,
      p_lane: lane || null,
      p_limit: limit,
      p_threshold: threshold,
    });

    if (error) throw new Error(`Search RPC error: ${error.message}`);

    const chunks = (data || []).map((row: any) => ({
      content: row.content,
      category: row.category,
      lane_affinity: row.lane_affinity,
      metadata: row.metadata,
      similarity: row.similarity,
    }));

    return new Response(JSON.stringify({
      chunks, count: chunks.length, query_lane: lane || "all",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("knowledge-search error:", e);
    return new Response(JSON.stringify({ error: e.message || "Search failed", chunks: [], count: 0 }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
