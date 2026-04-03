import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SmartPromptProps } from "@/components/SmartPrompt";
import type { ViralScoreCardProps, ApprovalPromptProps } from "@/components/SmartPrompt";

// ---- Types ----

export interface ChartDescriptor {
  type: "bar" | "line" | "radar" | "pie";
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  smartPrompt?: Omit<SmartPromptProps, "onSelect" | "isLoading">;
  viralCards?: (Omit<ViralScoreCardProps, "onSelect" | "selected"> & { variantId: string })[];
  approvalPrompt?: Omit<ApprovalPromptProps, "onApproveThisTime" | "onApproveAllTime" | "onBlock">;
  chartData?: ChartDescriptor;
  pdfUrl?: string;
  soloDecisions?: SoloModeDecision[];
}

export interface ApprovalItem {
  id: string;
  urgency: "BLOCKING" | "ADVISORY" | "INFORMATIONAL";
  category: string;
  proposedAction: string;
  originalRequest: string;
  isNonNegotiable: boolean;
  createdAt: Date;
}

export interface CompetitorAlert {
  id: string;
  clientId: string;
  competitorName: string;
  observedAction: string;
  inferredStrategy: string;
  clientRelevanceScore: number;
  confidence: number;
  recommendation: string;
  subjectsToElevate: string[];
  urgency: string;
  surfacedAt: Date;
  acknowledgedAt: Date | null;
}

export interface SoloModeDecision {
  submind: string;
  action: string;
  reasoning: string;
  timestamp: Date;
}

export interface KlycOrchestratorState {
  sessionId: string | null;
  messages: ConversationMessage[];
  isThinking: boolean;
  mode: "guided" | "solo";
  pendingApprovals: ApprovalItem[];
  competitorAlerts: CompetitorAlert[];
}

// ---- Helpers ----

function generateId(): string {
  return crypto.randomUUID();
}

function extractReplyText(raw: Record<string, unknown>): string {
  // Robust fallback chain — NEVER return empty or "unknown"
  const candidates = [raw.reply, raw.message, raw.response, raw.text, raw.content];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  // Try nested stage data
  if (raw.stages && Array.isArray(raw.stages) && raw.stages.length > 0) {
    const s = (raw.stages as Record<string, unknown>[])[0];
    const d = s?.data;
    if (typeof d === "string") return d;
    if (typeof d === "object" && d !== null) {
      const sd = d as Record<string, unknown>;
      return (sd.raw || sd.content || sd.message || JSON.stringify(d)) as string;
    }
  }
  if (raw.result) return typeof raw.result === "string" ? raw.result : JSON.stringify(raw.result);
  return JSON.stringify(raw);
}

function extractSource(raw: Record<string, unknown>): string {
  return ((raw.source as string) || (raw.intent as string) || "Klyc").replace(/^unknown$/i, "Klyc");
}

function parseOrchestratorResponse(raw: Record<string, unknown>): Partial<ConversationMessage> {
  const msg: Partial<ConversationMessage> = {};

  msg.content = extractReplyText(raw);

  if (raw.smart_prompt && typeof raw.smart_prompt === "object") {
    const sp = raw.smart_prompt as Record<string, unknown>;
    msg.smartPrompt = {
      question: (sp.question as string) || "",
      options: (sp.options as [string, string, string]) || ["", "", ""],
      fillInLabel: sp.fillInLabel as string | undefined,
    };
  }

  if (raw.viral_cards && Array.isArray(raw.viral_cards)) {
    msg.viralCards = (raw.viral_cards as Record<string, unknown>[]).map((c) => ({
      variantId: (c.variant_id as string) || generateId(),
      campaignName: (c.campaign_name as string) || "",
      platform: (c.platform as string) || "",
      headlineText: (c.headline_text as string) || "",
      imageUrl: c.image_url as string | undefined,
      scores: (c.scores as ViralScoreCardProps["scores"]) || {
        hook: 0, emotion: 0, share: 0, platform: 0, audience: 0, viral: 0,
      },
      modelType: (c.model_type as string) || "",
      voiceType: (c.voice_type as string) || "",
      thresholdStatus: (c.threshold_status as ViralScoreCardProps["thresholdStatus"]) || "MONITOR",
    }));
  }

  if (raw.approval_prompt && typeof raw.approval_prompt === "object") {
    const ap = raw.approval_prompt as Record<string, unknown>;
    msg.approvalPrompt = {
      urgency: (ap.urgency as ApprovalPromptProps["urgency"]) || "ADVISORY",
      category: (ap.category as string) || "",
      proposedAction: (ap.proposed_action as string) || "",
      originalRequest: (ap.original_request as string) || "",
      isNonNegotiable: (ap.is_non_negotiable as boolean) || false,
    };
  }

  if (raw.chart_data && typeof raw.chart_data === "object") {
    msg.chartData = raw.chart_data as ChartDescriptor;
  }

  if (raw.pdf_url && typeof raw.pdf_url === "string") {
    msg.pdfUrl = raw.pdf_url;
  }

  if (raw.solo_decisions && Array.isArray(raw.solo_decisions)) {
    msg.soloDecisions = (raw.solo_decisions as Record<string, unknown>[]).map((d) => ({
      submind: (d.submind as string) || "",
      action: (d.action as string) || "",
      reasoning: (d.reasoning as string) || "",
      timestamp: new Date((d.timestamp as string) || Date.now()),
    }));
  }

  return msg;
}

// ---- Hook ----

export function useKlycOrchestrator() {
  const [state, setState] = useState<KlycOrchestratorState>({
    sessionId: null,
    messages: [],
    isThinking: false,
    mode: "guided",
    pendingApprovals: [],
    competitorAlerts: [],
  });

  const sessionRef = useRef<string | null>(null);

  const addMessage = useCallback((msg: ConversationMessage) => {
    setState((prev) => ({ ...prev, messages: [...prev.messages, msg] }));
  }, []);

  const setThinking = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, isThinking: v }));
  }, []);

  const callOrchestrator = useCallback(
    async (payload: Record<string, unknown>) => {
      setThinking(true);
      try {
        const { data, error } = await supabase.functions.invoke("orchestrator", {
          body: {
            ...payload,
            session_id: sessionRef.current,
            mode: state.mode,
          },
        });

        if (error) throw error;

        const parsed = parseOrchestratorResponse(data || {});
        const assistantMsg: ConversationMessage = {
          id: generateId(),
          role: "assistant",
          content: parsed.content || "",
          timestamp: new Date(),
          smartPrompt: parsed.smartPrompt,
          viralCards: parsed.viralCards,
          approvalPrompt: parsed.approvalPrompt,
          chartData: parsed.chartData,
          pdfUrl: parsed.pdfUrl,
          soloDecisions: parsed.soloDecisions,
        };

        addMessage(assistantMsg);

        // Update pending approvals from response
        if (data?.pending_approvals && Array.isArray(data.pending_approvals)) {
          setState((prev) => ({
            ...prev,
            pendingApprovals: (data.pending_approvals as Record<string, unknown>[]).map((a) => ({
              id: (a.id as string) || generateId(),
              urgency: (a.urgency as ApprovalItem["urgency"]) || "ADVISORY",
              category: (a.category as string) || "",
              proposedAction: (a.proposed_action as string) || "",
              originalRequest: (a.original_request as string) || "",
              isNonNegotiable: (a.is_non_negotiable as boolean) || false,
              createdAt: new Date((a.created_at as string) || Date.now()),
            })),
          }));
        }

        return assistantMsg;
      } catch (err) {
        const errorMsg: ConversationMessage = {
          id: generateId(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: new Date(),
        };
        addMessage(errorMsg);
        console.error("Orchestrator error:", err);
        return errorMsg;
      } finally {
        setThinking(false);
      }
    },
    [state.mode, addMessage, setThinking]
  );

  const startSession = useCallback(
    async (clientId: string) => {
      const sid = generateId();
      sessionRef.current = sid;
      setState((prev) => ({
        ...prev,
        sessionId: sid,
        messages: [],
        pendingApprovals: [],
      }));

      // Fetch competitor alerts
      const { data: alerts } = await supabase
        .from("competitor_alerts")
        .select("*")
        .eq("client_id", clientId)
        .is("acknowledged_at", null)
        .order("surfaced_at", { ascending: false })
        .limit(20);

      if (alerts && alerts.length > 0) {
        setState((prev) => ({
          ...prev,
          competitorAlerts: alerts.map((a) => ({
            id: a.id,
            clientId: a.client_id || "",
            competitorName: a.competitor_name || "",
            observedAction: a.observed_action || "",
            inferredStrategy: a.inferred_strategy || "",
            clientRelevanceScore: a.client_relevance_score || 0,
            confidence: a.confidence || 0,
            recommendation: a.recommendation || "",
            subjectsToElevate: a.subjects_to_elevate || [],
            urgency: a.urgency || "LOW",
            surfacedAt: new Date(a.surfaced_at || Date.now()),
            acknowledgedAt: null,
          })),
        }));
      }

      await callOrchestrator({
        action: "start_session",
        client_id: clientId,
      });
    },
    [callOrchestrator]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      // Auto-start session if needed
      if (!sessionRef.current) {
        const sid = generateId();
        sessionRef.current = sid;
        setState((prev) => ({ ...prev, sessionId: sid }));
      }

      const userMsg: ConversationMessage = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      addMessage(userMsg);
      await callOrchestrator({ action: "chat", message: text });
    },
    [addMessage, callOrchestrator]
  );

  const selectOption = useCallback(
    async (messageId: string, choice: string) => {
      await callOrchestrator({
        action: "select_option",
        message_id: messageId,
        choice,
      });
    },
    [callOrchestrator]
  );

  const handleApproval = useCallback(
    async (approvalId: string, decision: "this_time" | "all_time" | "blocked") => {
      setState((prev) => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals.filter((a) => a.id !== approvalId),
      }));
      await callOrchestrator({
        action: "approval_decision",
        approval_id: approvalId,
        decision,
      });
    },
    [callOrchestrator]
  );

  const toggleMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: prev.mode === "guided" ? "solo" : "guided",
    }));
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    await supabase
      .from("competitor_alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", alertId);

    setState((prev) => ({
      ...prev,
      competitorAlerts: prev.competitorAlerts.filter((a) => a.id !== alertId),
    }));
  }, []);

  const getSoloModeLog = useCallback(
    async (sid: string): Promise<SoloModeDecision[]> => {
      const { data } = await supabase.functions.invoke("orchestrator", {
        body: { action: "get_solo_log", session_id: sid },
      });
      if (data?.decisions && Array.isArray(data.decisions)) {
        return (data.decisions as Record<string, unknown>[]).map((d) => ({
          submind: (d.submind as string) || "",
          action: (d.action as string) || "",
          reasoning: (d.reasoning as string) || "",
          timestamp: new Date((d.timestamp as string) || Date.now()),
        }));
      }
      return [];
    },
    []
  );

  return {
    ...state,
    sendMessage,
    selectOption,
    handleApproval,
    startSession,
    toggleMode,
    dismissAlert,
    getSoloModeLog,
  };
}
