// ============================================================
// APPROVAL SUBMIND — Gatekeeper
// Enforces client control. Anything deviating from what was
// asked or best practice MUST be approved. Only speaks KNP.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---- KNP Constants ----
const KNP_VERSION = "Ψ3";
const KNP_FIELD_SEPARATOR = "∷";
const KNP_VALUE_JOINER = "⊕";
const KNP_NULL_MARKER = "∅";

const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv",
  κw: "κw", πf: "πf", σo: "σo", αa: "αa",
} as const;

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("|");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return "Ψ" + Math.abs(h).toString(36);
}

// ---- Constants ----

// Four permanent gates — NEVER auto-approvable
const PERMANENT_GATES = ["PUBLISH", "SCHEDULE", "BUDGET", "NEW_PLATFORM"];

// All valid categories
const VALID_CATEGORIES = [
  ...PERMANENT_GATES,
  "CREATIVE_DEVIATION",
  "TIMING_DEVIATION",
  "AUDIENCE_DEVIATION",
  "CONFLICT",
];

type ApprovalDecision =
  | "APPROVED_THIS_TIME"
  | "APPROVED_ALL_TIME"
  | "BLOCKED"
  | "PENDING_USER";

type UrgencyLevel = "BLOCKING" | "ADVISORY" | "INFORMATIONAL";

interface ControlPreferences {
  always_ask: string[];
  auto_approve: string[];
  never_auto: string[];
}

const DEFAULT_PREFERENCES: ControlPreferences = {
  always_ask: [],
  auto_approve: [],
  never_auto: ["publish", "schedule", "budget", "new_platform"],
};

// ---- Conflict Detection ----

interface ConflictResult {
  hasConflict: boolean;
  conflictType: string;
  description: string;
  severity: UrgencyLevel;
}

function detectConflicts(
  proposed: string,
  originalRequest: string,
  category: string,
  conflictData: string | null
): ConflictResult {
  // Check for RED claim usage
  if (proposed && /\b(the best|unmatched|unrivaled|guaranteed|cure|heal)\b/i.test(proposed)) {
    return {
      hasConflict: true,
      conflictType: "RED_CLAIM_VIOLATION",
      description: "Content uses a RED claim from the Truth Map. This must be removed or replaced with a provable GREEN claim.",
      severity: "BLOCKING",
    };
  }

  // Check for character limit violations (common platform limits)
  const platformLimits: Record<string, number> = {
    twitter: 280, x: 280, threads: 500, linkedin: 3000,
    instagram: 2200, facebook: 63206, tiktok: 2200,
  };
  const proposedLower = proposed?.toLowerCase() || "";
  for (const [platform, limit] of Object.entries(platformLimits)) {
    if (proposedLower.includes(platform) && proposed.length > limit) {
      return {
        hasConflict: true,
        conflictType: "PLATFORM_LIMIT_EXCEEDED",
        description: `Content exceeds ${platform} character limit (${limit} chars). Current length: ${proposed.length}. Shorten the content.`,
        severity: "BLOCKING",
      };
    }
  }

  // Check for submind contradictions from conflict data
  if (conflictData && conflictData !== KNP_NULL_MARKER) {
    return {
      hasConflict: true,
      conflictType: "SUBMIND_CONTRADICTION",
      description: `Two subminds produced contradictory outputs: ${conflictData.slice(0, 200)}`,
      severity: "ADVISORY",
    };
  }

  return {
    hasConflict: false,
    conflictType: "",
    description: "",
    severity: "INFORMATIONAL",
  };
}

// ---- AI-Powered Deviation Analysis ----

async function analyzeDeviation(
  proposed: string,
  originalRequest: string,
  category: string
): Promise<{ deviates: boolean; reason: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || !originalRequest || !proposed) {
    return { deviates: false, reason: "" };
  }

  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a strict compliance checker. Compare the proposed output against the original request. Return JSON with: {"deviates": boolean, "reason": "string"}. deviates=true only if the proposal meaningfully differs from what was asked (not just stylistic differences). Be strict about factual claims and scope changes.`,
          },
          {
            role: "user",
            content: `Original request: ${originalRequest.slice(0, 500)}\n\nProposed output: ${proposed.slice(0, 500)}\n\nCategory: ${category}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return { deviates: false, reason: "" };

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { deviates: false, reason: "" };

    return JSON.parse(content);
  } catch {
    return { deviates: false, reason: "" };
  }
}

// ---- Main Handler ----

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload = await req.json();
    const segments = payload.segments || payload;

    // Extract KNP fields
    const proposed = segments[KNP.σo] || segments.σo || "";
    const originalRequest = segments[KNP.ξb] || segments.ξb || "";
    const clientId = segments[KNP.θc] || segments.θc || null;
    const categoryRaw = segments.zq || segments[KNP.ζq] || "CREATIVE_DEVIATION";
    const conflictData = segments[KNP.λv] || segments.λv || KNP_NULL_MARKER;
    const sessionId = payload.session_id || null;

    // Parse category (may be joined with ⊕)
    const category = categoryRaw.split(KNP_VALUE_JOINER)[0].toUpperCase();

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user ID
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    // 1. Load control preferences from client_brain
    let preferences = { ...DEFAULT_PREFERENCES };
    if (clientId) {
      const { data: brainData } = await supabase
        .from("client_brain")
        .select("data")
        .eq("client_id", clientId)
        .eq("document_type", "control_preferences")
        .single();

      if (brainData?.data) {
        const stored = brainData.data as unknown as ControlPreferences;
        preferences = {
          always_ask: stored.always_ask || [],
          auto_approve: stored.auto_approve || [],
          never_auto: [
            ...DEFAULT_PREFERENCES.never_auto,
            ...(stored.never_auto || []),
          ],
        };
      }
    }

    // 2. Check permanent gates first
    const isPermanentGate = PERMANENT_GATES.includes(category);

    // 3. Detect conflicts
    const conflict = detectConflicts(proposed, originalRequest, category, conflictData !== KNP_NULL_MARKER ? conflictData : null);

    // 4. Determine decision
    let decision: ApprovalDecision;
    let urgency: UrgencyLevel;
    let reason = "";

    if (conflict.hasConflict && conflict.severity === "BLOCKING") {
      // Conflict blocks — cannot proceed
      decision = "BLOCKED";
      urgency = "BLOCKING";
      reason = conflict.description;
    } else if (isPermanentGate) {
      // Permanent gates always require user approval
      decision = "PENDING_USER";
      urgency = "BLOCKING";
      reason = `${category} requires explicit approval every time. This is a permanent gate that cannot be auto-approved.`;
    } else if (preferences.auto_approve.includes(category.toLowerCase())) {
      // Previously approved for all time
      decision = "APPROVED_ALL_TIME";
      urgency = "INFORMATIONAL";
      reason = `Auto-approved based on standing preference for ${category.toLowerCase()}.`;
    } else if (preferences.always_ask.includes(category.toLowerCase())) {
      // Client explicitly wants to be asked
      decision = "PENDING_USER";
      urgency = "ADVISORY";
      reason = `Client prefers to review ${category.toLowerCase()} changes each time.`;
    } else {
      // Analyze for deviation
      const deviation = await analyzeDeviation(proposed, originalRequest, category);

      if (deviation.deviates) {
        decision = "PENDING_USER";
        urgency = "ADVISORY";
        reason = `Deviation detected: ${deviation.reason}`;
      } else if (conflict.hasConflict) {
        decision = "PENDING_USER";
        urgency = "ADVISORY";
        reason = conflict.description;
      } else {
        // No deviation, no conflict, not a permanent gate, not in always_ask
        decision = "APPROVED_THIS_TIME";
        urgency = "INFORMATIONAL";
        reason = "Content aligns with original request. No deviations detected.";
      }
    }

    // 5. Log to approval_history
    if (userId) {
      await supabase.from("approval_history").insert({
        user_id: userId,
        client_id: clientId,
        session_id: sessionId,
        category,
        what_was_proposed: proposed?.slice(0, 2000) || null,
        what_was_originally_asked: originalRequest?.slice(0, 2000) || null,
        decision,
        decided_at: decision !== "PENDING_USER" ? new Date().toISOString() : null,
      }).then(({ error }) => {
        if (error) console.warn("Approval history insert warning:", error.message);
      });
    }

    // 6. Build KNP response
    const decisionKnp = `${decision}${KNP_NULL_MARKER}`;
    const urgencyKnp = `${urgency}${KNP_NULL_MARKER}`;

    const responseSegments: Record<string, string> = {
      [KNP.σo]: decisionKnp,
      [KNP.πf]: urgencyKnp,
      zq: reason,
    };

    if (conflict.hasConflict && category === "CONFLICT") {
      responseSegments[KNP.λv] = conflictData;
    }

    const elapsed = Date.now() - startTime;

    const response = {
      version: KNP_VERSION,
      submind: "approval",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      // Structured data for Orchestrator
      decision,
      urgency,
      reason,
      category,
      is_permanent_gate: isPermanentGate,
      conflict_detected: conflict.hasConflict,
      conflict_type: conflict.conflictType || null,
      // Dual approval options (only for non-permanent gates that are PENDING_USER)
      approval_options: decision === "PENDING_USER" && !isPermanentGate
        ? ["APPROVED_THIS_TIME", "APPROVED_ALL_TIME"]
        : decision === "PENDING_USER" && isPermanentGate
          ? ["APPROVED_THIS_TIME"]
          : [],
      elapsed_ms: elapsed,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Approval submind error:", e);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: `BLOCKED${KNP_NULL_MARKER}`,
      [KNP.πf]: `BLOCKING${KNP_NULL_MARKER}`,
      zq: "Internal error in Gatekeeper — blocking as safety measure",
    };
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "approval",
        status: "error",
        checksum: knpChecksum(errorSegments),
        ...errorSegments,
        decision: "BLOCKED",
        urgency: "BLOCKING",
        error: e instanceof Error ? e.message : "Unknown error",
        elapsed_ms: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
