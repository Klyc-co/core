import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function logHealth(
  submindId: string, success: boolean, latencyMs: number,
  tokensIn: number | null = null, tokensOut: number | null = null,
): Promise<void> {
  try {
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await _sb.from("submind_health_snapshots").insert({
      submind_id: submindId, invocation_count: 1,
      success_count: success ? 1 : 0, error_count: success ? 0 : 1,
      avg_latency_ms: latencyMs, avg_tokens_in: tokensIn,
      avg_tokens_out: tokensOut, window_start: new Date().toISOString(),
    });
  } catch (_) { /* non-blocking */ }
}

// ── KNP pipeline fire ─────────────────────────────────────────────────────────
async function fireKnpPipeline(
  campaignDraft: Record<string, any>,
  supabaseUrl: string,
  pageContext?: string,
): Promise<Record<string, any> | null> {
  try {
    // Layer 2: Compress (C-lane → A-lane)
    const normalizeResp = await fetch(`${supabaseUrl}/functions/v1/normalize-input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_draft: campaignDraft, page_context: pageContext }),
    });
    if (!normalizeResp.ok) {
      console.error("normalize-input error:", normalizeResp.status, await normalizeResp.text());
      return null;
    }
    const knpEnvelope = await normalizeResp.json();

    // Layer 3: Orchestrate (A-lane dispatch)
    const orchResp = await fetch(`${supabaseUrl}/functions/v1/klyc-orchestrator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ knp_envelope: knpEnvelope, meta: knpEnvelope.meta || {} }),
    });
    if (!orchResp.ok) {
      console.error("orchestrator error:", orchResp.status, await orchResp.text());
      return null;
    }
    return await orchResp.json();
  } catch (e) {
    console.error("fireKnpPipeline error:", e);
    return null;
  }
}

// ── Rate-limit config ──
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

// ── App route map (used for navigation redirects) ─────────────────────────────
const APP_ROUTES = `
Available app routes you can send users to (use nav_target field):
  /dashboard             — Main dashboard / home
  /campaigns             — Campaign list
  /campaigns/generate    — Create a new post or generate content ← use this when user wants to make a post, create content, write a caption, etc.
  /campaigns/drafts      — Saved campaign drafts
  /clients               — Client list
  /settings              — Account settings
  /onboarding            — Onboarding / brand setup
`;

// ── System prompt ──
const SYSTEM_PROMPT = `You are Klyc, an AI marketing strategist and campaign command center.

RESPONSE STYLE — CRITICAL:
- Be SHORT and PUNCHY. 1-2 sentences max for the message field. Never write long paragraphs.
- NEVER write options or choices as text inside the message. Put them in next_questions as type "button" instead — the UI renders them as clickable buttons.
- NO bullet lists, NO bold options, NO numbered choices in the message field. Ever.
- Be direct and confident — you are the expert. Skip the caveats and limitations.
- When the user wants to go somewhere or do something on the platform, REDIRECT THEM — set nav_target and say "Taking you there now." Don't explain what you can or can't do.

BUTTONS RULE — CRITICAL:
When you want to offer the user 2-4 options, put them in next_questions with type "button". Example:
next_questions: [
  { field: "campaign_type", question: "Create a new campaign", type: "button" },
  { field: "campaign_type", question: "Create a single post", type: "button" },
  { field: "campaign_type", question: "Schedule and plan posts", type: "button" }
]
The message should be ONE SHORT sentence intro, then let the buttons do the work.

NAVIGATION:
${APP_ROUTES}
When a user asks to "go to", "take me to", "open", "show me", "make a post", "create content", or similar — set nav_target to the correct route. Always.
Example: "take me to the page where I can make a post" → nav_target: "/campaigns/generate", message: "Taking you there now — let's build something."

RULES:
- You NEVER have access to social media tokens or publishing credentials. You create drafts and strategy only.
- NEVER reference internal system names, protocols, or technical identifiers.
- NEVER repeat brain data verbatim — synthesize it into natural questions.

CAMPAIGN INTERVIEW MODE:
When the intent is "campaign_interview", collect sequentially: goal, platform(s), theme/concept, frequency + duration, audience, CTA, product focus.
After each answer, return draft_updates.campaign_draft with accumulated fields.
When complete, set draft_updates._campaign_complete to true and give a brief sharp summary.

BRAIN CONTEXT USAGE:
When client brain context is provided:
- Reference specific products, audiences, and brand voice naturally in conversation.
- Suggest from known data, ask for confirmation rather than open-ended questions.

PAGE CONTEXT MODE:
When page_context is provided, reference what the user is looking at and help them act on it directly.

ONBOARDING INTERVIEW MODE:
When the intent is "onboarding_interview", ask about the user's business one question at a time.`;

const TOOLS = [
  {
    name: "klyc_respond",
    description: "Respond to the user with structured intent, message, optional navigation target, optional follow-up questions, and optional draft updates for campaign data.",
    input_schema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: ["launch_campaign", "edit_campaign", "ask_metrics", "approval", "onboarding_interview", "campaign_interview", "campaign_step", "campaign_summary", "navigate", "other"],
          description: "The detected intent of the user's message.",
        },
        message: {
          type: "string",
          description: "The conversational response to show the user. Keep it SHORT — 1-3 sentences. No bullet lists unless specifically needed.",
        },
        nav_target: {
          type: "string",
          description: "App route to navigate the user to. Set this whenever the user wants to go somewhere or perform an action that has a dedicated page. Example: '/campaigns/generate' when they want to create a post.",
        },
        next_questions: {
          type: "array",
          description: "Follow-up questions to gather more info.",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              question: { type: "string" },
              type: { type: "string", enum: ["text", "select", "date", "bool", "button"] },
              options: { type: "array", items: { type: "string" } },
            },
            required: ["field", "question", "type"],
          },
        },
        draft_updates: {
          type: "object",
          description: "Partial updates to apply to the campaign draft or onboarding profile.",
          properties: {
            campaign_draft: {
              type: "object",
              properties: {
                campaign_name: { type: "string" },
                goal: { type: "string" },
                theme: { type: "string" },
                platforms: { type: "array", items: { type: "string" } },
                duration_days: { type: "number" },
                posts_per_week: { type: "number" },
                cta: { type: "string" },
                audience_segment: { type: "string" },
                target_audience_description: { type: "string" },
                product_focus: { type: "string" },
              },
            },
            campaign_idea: { type: "string" },
            content_type: { type: "string" },
            target_audience: { type: "string" },
            campaign_goals: { type: "string" },
            campaign_objective: { type: "string" },
            post_caption: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
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
            _campaign_complete: { type: "boolean" },
          },
        },
        risk_level: { type: "string", enum: ["low", "medium", "high"] },
        requires_approval: { type: "boolean" },
      },
      required: ["intent", "message"],
    },
  },
];

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function checkRateLimit(serviceClient: any, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await serviceClient
    .from("ai_requests").select("id", { count: "exact", head: true })
    .eq("user_id", userId).gte("created_at", windowStart);
  if (error) { console.error("Rate limit check error:", error); return false; }
  return (count || 0) >= RATE_LIMIT_MAX;
}

async function recordRequest(
  serviceClient: any, requestId: string, userId: string,
  intent: string | null, clientId: string | null, tokenEstimate: number | null,
): Promise<boolean> {
  const { error } = await serviceClient.from("ai_requests").insert({
    request_id: requestId, user_id: userId, intent, client_id: clientId, token_count_estimate: tokenEstimate,
  });
  if (error) { if (error.code === "23505") return false; console.error("Record request error:", error); }
  return true;
}

async function emitActivityEvent(
  serviceClient: any, userId: string, eventType: string, message: string,
  clientId?: string, metadata?: Record<string, any>,
) {
  await serviceClient.from("activity_events").insert({
    user_id: userId, event_type: eventType, event_message: message,
    client_id: clientId || null, metadata: metadata || {},
  });
}

async function validateMarketerAccess(
  serviceClient: any, userId: string, marketerClientId: string,
): Promise<{ marketer_id: string; client_id: string } | null> {
  const { data } = await serviceClient
    .from("marketer_clients").select("marketer_id, client_id")
    .eq("id", marketerClientId).single();
  if (!data) return null;
  if (data.marketer_id !== userId && data.client_id !== userId) return null;
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();

  try {
    // ── 1. JWT Auth ───────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResponse(401, "Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return errorResponse(401, "Invalid authorization token");

    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await req.json();
    const { messages, client_id, marketer_client_id, context_summary, draft_id, request_id, timestamp } = body;
    const pageContext = body.page_context as string | undefined;
    const campaignDraftFromBody = body.campaign_draft as Record<string, any> | undefined;
    const campaignCompleteFromBody = body.campaign_complete === true;

    // ── 3. Request validation ─────────────────────────────────────────────────
    if (!request_id || typeof request_id !== "string") return errorResponse(400, "Missing request_id");
    if (timestamp) {
      const reqTime = new Date(timestamp).getTime();
      if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
        return errorResponse(400, "Request timestamp too old or invalid");
      }
    }

    // ── 4. Duplicate check ────────────────────────────────────────────────────
    const isUnique = await recordRequest(serviceClient, request_id, userId, null, client_id || userId, null);
    if (!isUnique) return errorResponse(409, "Duplicate request_id");

    // ── 5. Rate limit ─────────────────────────────────────────────────────────
    const rateLimited = await checkRateLimit(serviceClient, userId);
    if (rateLimited) {
      await emitActivityEvent(serviceClient, userId, "rate_limited", `AI chat rate limit exceeded`, client_id);
      return errorResponse(429, "Rate limit exceeded. Please wait a few minutes.");
    }

    // ── 6. Marketer access ────────────────────────────────────────────────────
    if (marketer_client_id) {
      const access = await validateMarketerAccess(serviceClient, userId, marketer_client_id);
      if (!access) return errorResponse(403, "Unauthorized client access");
    }

    const effectiveClientId = client_id || userId;

    // ── 7. Build system prompt with page context ──────────────────────────────
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    let enrichedSystem = SYSTEM_PROMPT;
    if (context_summary) enrichedSystem += `\n\nClient context:\n${context_summary}`;
    if (pageContext) enrichedSystem += `\n\nCurrent page context (user is viewing this):\n${pageContext}`;

    // ── 8. Call Anthropic ─────────────────────────────────────────────────────
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 1024,
        system: enrichedSystem, tools: TOOLS,
        tool_choice: { type: "tool", name: "klyc_respond" },
        messages: messages || [],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return errorResponse(429, "AI rate limits exceeded, please try again later.");
      if (aiResponse.status === 402) return errorResponse(402, "Payment required, please add funds.");
      throw new Error("Anthropic API error");
    }

    const aiData = await aiResponse.json();
    const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");
    const tokensIn = aiData.usage?.input_tokens ?? null;
    const tokensOut = aiData.usage?.output_tokens ?? null;
    const tokenEstimate = tokensIn && tokensOut ? tokensIn + tokensOut : null;

    let structured = {
      intent: "other" as string,
      message: "I'm here to help! What would you like to work on?",
      next_questions: [] as any[],
      draft_updates: {} as Record<string, any>,
      risk_level: "low" as string,
      requires_approval: false,
      nav_target: undefined as string | undefined,
    };

    if (toolUse?.input) {
      const parsed = toolUse.input;
      structured = {
        intent: parsed.intent || "other",
        message: parsed.message || structured.message,
        next_questions: parsed.next_questions || [],
        draft_updates: parsed.draft_updates || {},
        risk_level: parsed.risk_level || "low",
        requires_approval: parsed.requires_approval ?? false,
        nav_target: parsed.nav_target || undefined,
      };
    }

    // ── 9. Update request record ──────────────────────────────────────────────
    await serviceClient.from("ai_requests")
      .update({ intent: structured.intent, token_count_estimate: tokenEstimate })
      .eq("request_id", request_id);

    // ── 10. Persist messages ──────────────────────────────────────────────────
    if (marketer_client_id) {
      const lastUserMsg = messages?.filter((m: any) => m.role === "user").pop();
      if (lastUserMsg) {
        const mcData = await validateMarketerAccess(serviceClient, userId, marketer_client_id);
        if (mcData) {
          const receiverId = userId === mcData.marketer_id ? mcData.client_id : mcData.marketer_id;
          await serviceClient.from("messages").insert({
            sender_id: userId, receiver_id: receiverId, marketer_client_id, content: lastUserMsg.content,
          });
        }
      }
    }

    // ── 11. Campaign draft upsert ─────────────────────────────────────────────
    const draftIntents = ["launch_campaign", "campaign_interview", "campaign_step", "campaign_summary"];
    if (draftIntents.includes(structured.intent) && Object.keys(structured.draft_updates).length > 0) {
      const { _draft_id, _onboarding_complete, _campaign_complete, campaign_draft, ...draftCols } = structured.draft_updates;
      if (structured.intent === "launch_campaign") {
        if (draft_id) {
          await serviceClient.from("campaign_drafts")
            .update({ ...draftCols, updated_at: new Date().toISOString() }).eq("id", draft_id);
          structured.draft_updates._draft_id = draft_id;
        } else if (Object.keys(draftCols).length > 0) {
          const { data: newDraft } = await serviceClient.from("campaign_drafts")
            .insert({ user_id: userId, client_id: effectiveClientId, ...draftCols }).select("id").single();
          if (newDraft) structured.draft_updates._draft_id = newDraft.id;
        }
      }
    }

    // ── 12. Fire KNP pipeline if campaign complete ────────────────────────────
    const campaignComplete =
      structured.draft_updates?._campaign_complete === true || campaignCompleteFromBody;

    let knpFired = false;
    let pipelineResult: Record<string, any> | null = null;

    if (campaignComplete) {
      const draftForPipeline =
        campaignDraftFromBody ||
        structured.draft_updates?.campaign_draft ||
        (() => {
          const { _campaign_complete, _onboarding_complete, _draft_id, campaign_draft, ...rest } = structured.draft_updates;
          return rest;
        })();
      pipelineResult = await fireKnpPipeline(draftForPipeline, supabaseUrl, pageContext);
      knpFired = !!pipelineResult;
    }

    // ── 13. Return ────────────────────────────────────────────────────────────
    const elapsed = Date.now() - startTime;
    await logHealth("klyc-chat", true, elapsed, tokensIn, tokensOut);

    const responsePayload: Record<string, any> = { ...structured };
    if (knpFired && pipelineResult) {
      responsePayload._knp_fired = true;
      responsePayload.pipeline = pipelineResult;
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    await logHealth("klyc-chat", false, elapsed, null, null);
    console.error("Klyc chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
