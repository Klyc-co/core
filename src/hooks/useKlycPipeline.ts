import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

export interface StageResult {
  focus: string;
  status: "pending" | "running" | "complete" | "error" | "skipped";
  durationMs: number;
  data: any;
  error?: string;
  tokens?: { input: number; output: number };
  description?: string;
}

export interface PipelineSummary {
  totalMs: number;
  stageCount: number;
  completedCount: number;
  errorCount: number;
}

export interface CompressionStats {
  knpCompression: number;
  knpVersion?: string;
}

export interface CampaignInput {
  campaignBrief?: string;
  targetAudience?: string;
  productInfo?: string;
  competitiveContext?: string;
  brandVoice?: string;
  keywords?: string | string[];
  platforms?: string | string[];
  objective?: string;
  [key: string]: any;
}

const PIPELINE_URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-pipeline`;

// ── Hook ──

export function useKlycPipeline() {
  const [stages, setStages] = useState<Record<string, StageResult>>({});
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [compression, setCompression] = useState<CompressionStats | null>(null);
  const [viralScore, setViralScore] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token ?? ""}`,
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  }, []);

  // ── SSE stream parser ──
  const runSSE = useCallback(async (body: Record<string, any>) => {
    const headers = await getHeaders();
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch(PIPELINE_URL_BASE, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Pipeline returned ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          try {
            const payload = JSON.parse(line.slice(6));
            handleSSEEvent(currentEvent, payload);
          } catch { /* skip malformed */ }
          currentEvent = "";
        }
      }
    }
  }, [getHeaders]);

  const handleSSEEvent = useCallback((event: string, payload: any) => {
    if (event === "stage_start") {
      setStages(prev => ({
        ...prev,
        [payload.focus]: {
          focus: payload.focus,
          status: "running",
          durationMs: 0,
          data: null,
          description: payload.description,
        },
      }));
    } else if (event === "stage_complete") {
      setStages(prev => ({
        ...prev,
        [payload.focus]: {
          focus: payload.focus,
          status: payload.status === "complete" ? "complete" : payload.status === "skipped" ? "skipped" : "error",
          durationMs: payload.durationMs ?? 0,
          data: payload.data,
          error: payload.error,
          tokens: payload.tokens,
        },
      }));

      // Extract viral score from analytics stage
      if (payload.focus === "analytics" && payload.data?.viral_score != null) {
        setViralScore(payload.data.viral_score);
      }

      // Extract compression from normalizer
      if (payload.focus === "normalizer" && payload.data) {
        setCompression({
          knpCompression: payload.data.compressionRatio ?? 0,
          knpVersion: payload.data.knpVersion,
        });
      }
    } else if (event === "pipeline_complete") {
      setSummary({
        totalMs: payload.totalMs,
        stageCount: payload.stageCount,
        completedCount: payload.stageCount, // SSE complete means all ran
        errorCount: 0,
      });
      if (payload.knpCompression != null) {
        setCompression(prev => ({ ...prev, knpCompression: payload.knpCompression } as CompressionStats));
      }
    }
  }, []);

  // ── JSON fallback ──
  const runJSON = useCallback(async (body: Record<string, any>) => {
    const headers = await getHeaders();
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch(PIPELINE_URL_BASE, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Pipeline error ${res.status}`);

    const stageMap: Record<string, StageResult> = {};
    for (const s of json.stages || []) {
      stageMap[s.focus] = {
        focus: s.focus,
        status: s.status === "complete" ? "complete" : s.status === "skipped" ? "skipped" : "error",
        durationMs: s.durationMs ?? 0,
        data: s.data,
        error: s.error,
        tokens: s.tokens,
      };
    }
    setStages(stageMap);

    const completed = (json.stages || []).filter((s: any) => s.status === "complete").length;
    const errors = (json.stages || []).filter((s: any) => s.status === "error").length;
    setSummary({
      totalMs: json.totalMs ?? json.summary?.totalMs ?? 0,
      stageCount: (json.stages || []).length,
      completedCount: completed,
      errorCount: errors,
    });

    if (json.knpCompression != null) {
      setCompression({ knpCompression: json.knpCompression });
    }

    return json;
  }, [getHeaders]);

  // ── Public methods ──

  const reset = useCallback(() => {
    setStages({});
    setSummary(null);
    setCompression(null);
    setViralScore(null);
  }, []);

  const launch = useCallback(async (input: CampaignInput) => {
    reset();
    setIsRunning(true);
    try {
      await runSSE({ action: "create", input });
    } catch (err) {
      // SSE failed → fallback to JSON
      console.warn("SSE failed, falling back to JSON:", err);
      try {
        await runJSON({ action: "create", input });
      } catch (jsonErr) {
        console.error("Pipeline failed:", jsonErr);
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [runSSE, runJSON, reset]);

  const simulate = useCallback(async (stageList: string[], input: CampaignInput) => {
    reset();
    setIsRunning(true);
    try {
      await runSSE({ action: "simulate", stages: stageList, input });
    } catch {
      try {
        await runJSON({ action: "simulate", stages: stageList, input });
      } catch (e) {
        console.error("Simulate failed:", e);
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [runSSE, runJSON, reset]);

  const runSingle = useCallback(async (focus: string, input: CampaignInput) => {
    reset();
    setIsRunning(true);
    try {
      await runJSON({ action: "single", focus, input });
    } catch (e) {
      console.error("Single run failed:", e);
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [runJSON, reset]);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const headers = await getHeaders();
      const res = await fetch(PIPELINE_URL_BASE, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "health" }),
      });
      const json = await res.json();
      return json.status === "ok";
    } catch {
      return false;
    }
  }, [getHeaders]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  }, []);

  return { stages, summary, compression, viralScore, isRunning, launch, simulate, runSingle, checkHealth, cancel };
}
