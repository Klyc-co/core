// KLYC Orchestrator — Anthropic Proxy
// Simple proxy to Claude API with streaming SSE support.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT =
  "You are Klyc, an AI marketing strategist. You help users create campaigns, analyze trends, review performance, revise content, and generate learning reports. Be conversational, helpful, and concise.";

const MODEL = "claude-sonnet-4-20250514";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured. Please add it to your edge function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    // Health check
    if (body.action === "health") {
      return new Response(
        JSON.stringify({ status: "ok", model: MODEL, provider: "anthropic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userMessage = body.message || "";
    if (!userMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "No message provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build messages array with conversation history
    const messages: Array<{ role: string; content: string }> = [];
    if (Array.isArray(body.history)) {
      for (const msg of body.history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: "user", content: userMessage });

    // Call Anthropic with streaming
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "Unknown error");
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: `AI service error (${anthropicRes.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Stream the Anthropic SSE response back to the client, re-formatting to our SSE protocol
    const reader = anthropicRes.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process line by line
            let newlineIdx: number;
            while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIdx).trim();
              buffer = buffer.slice(newlineIdx + 1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6);
              if (jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "content_block_delta" && event.delta?.text) {
                  // Forward as our chunk event
                  controller.enqueue(
                    encoder.encode(`event: chunk\ndata: ${JSON.stringify({ delta: event.delta.text })}\n\n`),
                  );
                }

                if (event.type === "message_start" && event.message?.usage) {
                  inputTokens = event.message.usage.input_tokens || 0;
                }

                if (event.type === "message_delta" && event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
              } catch {
                // Ignore unparseable lines
              }
            }
          }
        } catch (err) {
          console.error("Stream read error:", err);
        }

        // Send done event with usage stats
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ usage: { input_tokens: inputTokens, output_tokens: outputTokens } })}\n\n`,
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Orchestrator error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
