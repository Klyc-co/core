import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Rate-limit config ──
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30; // 30 requests per window

// ── System prompt ──
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
            enum: ["launch_campaign", "edit_campaign", "ask_metrics", "approval", "onboarding_interview", "other"],
            description: "The detected intent of the user's message.",
          },
          message: {
            type: "string",
            description: "The conversational response to show the user.",
          },
          next_questions: {
            type: "array",
            description: "Follow-up questions to gather more info.",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                question: { type: "string" },
                type: { type: "string", enum: ["text", "select", "date", "bool"] },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["field", "question", "type"],
              additionalProperties: false,
            },
          },
          draft_updates: {
            type: "object",
            description: "Partial updates to apply to the campaign draft.",
            properties: {
              campaign_idea: { type: "string" },
              content_type: { type: "string" },
              target_audience: { type: "string" },
              campaign_goals: { type: "string" },
              campaign_objective: { type: "string" },
              target_audience_description: { type: "string" },
              post_caption: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              // Onboarding fields
              business_name: { type: "string" },
              company_description: { type: "string" },
              description: { type: "string" },
              industry: { type: "string" },
              value_proposition: { type: "string" },
              positioning: { type: "string" },
              tone: { type: "string" },
              writing_style: { type: "string" },
              emoji_usage: { type: "string" },
              main_competitors: { type: "string" },
              product_category: { type: "string" },
              website: { type: "string" },
              marketing_goals: { type: "string" },
              _onboarding_complete: { type: "boolean" },
            },
            additionalProperties: false,
          },
          risk_level: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          requires_approval: {
            type: "boolean",
          },
        },
        required: ["intent", "message"],
        additionalProperties: false,
      },
    },
  },
];

// ── Helpers ──

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function checkRateLimit(
  serviceClient: any,
  userId: string,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count, error } = await serviceClient
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate limit check error:", error);
    return false; // fail open on DB error
  }

  return (count || 0) >= RATE_LIMIT_MAX;
}

async function recordRequest(
  serviceClient: any,
  requestId: string,
  userId: string,
  intent: string | null,
  clientId: string | null,
  tokenEstimate: number | null,
): Promise<boolean> {
  const { error } = await serviceClient.from("ai_requests").insert({
    request_id: requestId,
    user_id: userId,
    intent,
    client_id: clientId,
    token_count_estimate: tokenEstimate,
  });

  if (error) {
    // Unique constraint violation = duplicate request
    if (error.code === "23505") return false;
    console.error("Record request error:", error);
  }
  return true;
}

async function emitActivityEvent(
  serviceClient: any,
  userId: string,
  eventType: string,
  message: string,
  clientId?: string,
  metadata?: Record<string, any>,
) {
  await serviceClient.from("activity_events").insert({
    user_id: userId,
    event_type: eventType,
    event_message: message,
    client_id: clientId || null,
    metadata: metadata || {},
  });
}

async function validateMarketerAccess(
  serviceClient: any,
  userId: string,
  marketerClientId: string,
): Promise<{ marketer_id: string; client_id: string } | null> {
  const { data } = await serviceClient
    .from("marketer_clients")
    .select("marketer_id, client_id")
    .eq("id", marketerClientId)
    .single();

  if (!data) return null;

  // User must be either the marketer or the client
  if (data.marketer_id !== userId && data.client_id !== userId) return null;

  return data;
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. JWT Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "Missing authorization");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return errorResponse(401, "Invalid authorization token");
    }

    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ── 2. Parse body ──
    const body = await req.json();
    const {
      messages,
      client_id,
      marketer_client_id,
      context_summary,
      draft_id,
      request_id,
      timestamp,
    } = body;

    // ── 3. Request signing validation ──
    if (!request_id || typeof request_id !== "string") {
      return errorResponse(400, "Missing request_id");
    }

    // Reject requests older than 5 minutes (replay prevention)
    if (timestamp) {
      const reqTime = new Date(timestamp).getTime();
      if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
        return errorResponse(400, "Request timestamp too old or invalid");
      }
    }

    // ── 4. Duplicate request check ──
    const isUnique = await recordRequest(serviceClient, request_id, userId, null, client_id || userId, null);
    if (!isUnique) {
      return errorResponse(409, "Duplicate request_id");
    }

    // ── 5. Rate limiting ──
    const rateLimited = await checkRateLimit(serviceClient, userId);
    if (rateLimited) {
      await emitActivityEvent(serviceClient, userId, "rate_limited", `AI chat rate limit exceeded (${RATE_LIMIT_MAX}/${RATE_LIMIT_WINDOW_MS / 60000}min)`, client_id);
      return errorResponse(429, "Rate limit exceeded. Please wait a few minutes.");
    }

    // ── 6. Marketer-client access validation ──
    if (marketer_client_id) {
      const access = await validateMarketerAccess(serviceClient, userId, marketer_client_id);
      if (!access) {
        return errorResponse(403, "Unauthorized client access");
      }
    }

    const effectiveClientId = client_id || userId;

    // ── 7. Call AI (never from client) ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let enrichedSystem = SYSTEM_PROMPT;
    if (context_summary) {
      enrichedSystem += `\n\nClient context:\n${context_summary}`;
    }

    // Log minimal metadata only (no full prompts)
    console.log("Klyc chat:", JSON.stringify({
      user_id: userId,
      client_id: effectiveClientId,
      message_count: messages?.length || 0,
      request_id,
    }));

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
          ...(messages || []),
        ],
        tools: TOOLS,
        tool_choice: { type: "function", function: { name: "klyc_respond" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return errorResponse(429, "AI rate limits exceeded, please try again later.");
      }
      if (aiResponse.status === 402) {
        return errorResponse(402, "Payment required, please add funds.");
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    // Estimate token usage for audit
    const tokenEstimate = aiData.usage?.total_tokens || null;

    let structured = {
      intent: "other" as string,
      message: "I'm here to help! What would you like to work on?",
      next_questions: [] as any[],
      draft_updates: {} as Record<string, any>,
      risk_level: "low" as string,
      requires_approval: false,
    };

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        structured = {
          intent: parsed.intent || "other",
          message: parsed.message || structured.message,
          next_questions: parsed.next_questions || [],
          draft_updates: parsed.draft_updates || {},
          risk_level: parsed.risk_level || "low",
          requires_approval: parsed.requires_approval ?? false,
        };
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // ── 8. Update ai_requests record with intent + token count ──
    await serviceClient
      .from("ai_requests")
      .update({
        intent: structured.intent,
        token_count_estimate: tokenEstimate,
      })
      .eq("request_id", request_id);

    // ── 9. Persist messages if marketer_client_id provided ──
    if (marketer_client_id) {
      const lastUserMsg = messages?.filter((m: any) => m.role === "user").pop();
      if (lastUserMsg) {
        const mcData = await validateMarketerAccess(serviceClient, userId, marketer_client_id);
        if (mcData) {
          const receiverId = userId === mcData.marketer_id ? mcData.client_id : mcData.marketer_id;
          await serviceClient.from("messages").insert({
            sender_id: userId,
            receiver_id: receiverId,
            marketer_client_id: marketer_client_id,
            content: lastUserMsg.content,
          });
        }
      }
    }

    // ── 10. Campaign draft upsert ──
    if (structured.intent === "launch_campaign" && Object.keys(structured.draft_updates).length > 0) {
      // Filter out non-column fields
      const { _draft_id, _onboarding_complete, ...draftCols } = structured.draft_updates;

      if (draft_id) {
        await serviceClient
          .from("campaign_drafts")
          .update({ ...draftCols, updated_at: new Date().toISOString() })
          .eq("id", draft_id);
        structured.draft_updates._draft_id = draft_id;
      } else if (Object.keys(draftCols).length > 0) {
        const { data: newDraft } = await serviceClient
          .from("campaign_drafts")
          .insert({
            user_id: userId,
            client_id: effectiveClientId,
            ...draftCols,
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
