import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Klyc, an AI marketing strategist and campaign command center.
You help users plan, create, and manage marketing campaigns through structured conversation.

IMPORTANT RULES:
- You NEVER have access to social media tokens or publishing credentials.
- You ONLY create drafts and scheduling suggestions. Publishing is handled separately.
- You guide users through campaign creation via structured questions.
- When a user wants to create a campaign, interview them step-by-step for: campaign name, target audience, platforms, content type, schedule, and goals.

You must ALWAYS call one of the provided tools to respond. Never respond with plain text.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "klyc_respond",
      description: "Respond to the user with structured intent, message, optional follow-up questions, and optional draft updates for campaign data.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["launch_campaign", "edit_campaign", "ask_metrics", "approval", "other"],
            description: "The detected intent of the user's message.",
          },
          message: {
            type: "string",
            description: "The conversational response to show the user.",
          },
          next_questions: {
            type: "array",
            description: "Follow-up questions to gather more info. Empty if none needed.",
            items: {
              type: "object",
              properties: {
                field: { type: "string", description: "The campaign field this question maps to (e.g. campaign_idea, target_audience, content_type, platforms, campaign_goals, scheduled_date)." },
                question: { type: "string", description: "The question to ask the user." },
                type: { type: "string", enum: ["text", "select", "date", "bool"], description: "Input type for the UI." },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Options for select type. Omit for other types.",
                },
              },
              required: ["field", "question", "type"],
              additionalProperties: false,
            },
          },
          draft_updates: {
            type: "object",
            description: "Partial updates to apply to the campaign draft. Keys are campaign_drafts column names.",
            properties: {
              campaign_idea: { type: "string" },
              content_type: { type: "string" },
              target_audience: { type: "string" },
              campaign_goals: { type: "string" },
              campaign_objective: { type: "string" },
              target_audience_description: { type: "string" },
              post_caption: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
          },
        },
        required: ["intent", "message"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      messages,
      client_id,
      marketer_client_id,
      context_summary,
      draft_id,
    } = body;

    const effectiveClientId = client_id || user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context-enriched system prompt
    let enrichedSystem = SYSTEM_PROMPT;
    if (context_summary) {
      enrichedSystem += `\n\nClient context:\n${context_summary}`;
    }

    console.log("Klyc structured chat - User:", user.id, "Client:", effectiveClientId, "Messages:", messages.length);

    // Call AI with tool_choice to force structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: enrichedSystem },
          ...messages,
        ],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "klyc_respond" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let structured = {
      intent: "other" as string,
      message: "I'm here to help! What would you like to work on?",
      next_questions: [] as any[],
      draft_updates: {} as Record<string, any>,
    };

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        structured = {
          intent: parsed.intent || "other",
          message: parsed.message || structured.message,
          next_questions: parsed.next_questions || [],
          draft_updates: parsed.draft_updates || {},
        };
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Use service client for DB writes (bypasses RLS for cross-user writes)
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Persist user message if marketer_client_id provided
    if (marketer_client_id) {
      const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
      if (lastUserMsg) {
        // Find the receiver: if user is marketer, receiver is client; vice versa
        const { data: mcData } = await serviceClient
          .from("marketer_clients")
          .select("marketer_id, client_id")
          .eq("id", marketer_client_id)
          .single();

        if (mcData) {
          const receiverId = user.id === mcData.marketer_id ? mcData.client_id : mcData.marketer_id;
          await serviceClient.from("messages").insert({
            sender_id: user.id,
            receiver_id: receiverId,
            marketer_client_id: marketer_client_id,
            content: lastUserMsg.content,
          });
        }
      }
    }

    // If intent is launch_campaign, create or update campaign_drafts
    if (structured.intent === "launch_campaign" && Object.keys(structured.draft_updates).length > 0) {
      if (draft_id) {
        // Update existing draft
        await serviceClient
          .from("campaign_drafts")
          .update({ ...structured.draft_updates, updated_at: new Date().toISOString() })
          .eq("id", draft_id);
        structured.draft_updates._draft_id = draft_id;
      } else {
        // Create new draft
        const { data: newDraft } = await serviceClient
          .from("campaign_drafts")
          .insert({
            user_id: user.id,
            client_id: effectiveClientId,
            ...structured.draft_updates,
          })
          .select("id")
          .single();

        if (newDraft) {
          structured.draft_updates._draft_id = newDraft.id;
        }
      }
    }

    return new Response(JSON.stringify(structured), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Klyc chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
