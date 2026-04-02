// ============================================================
// KLYC ANALYTICS SUBMIND — Visualization Engine
// Receives KNP payloads, returns chart descriptors, checkpoint
// timelines, and PDF report URLs. Speaks ONLY KNP.
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
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv", κw: "κw", πf: "πf", σo: "σo",
  ρr: "ρr", φd: "φd", ηn: "ηn", ωs: "ωs", δi: "δi", εe: "εe", αa: "αa", χy: "χy", ψv: "ψv",
} as const;

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + v).join("|");
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return "Ψ" + Math.abs(h).toString(36);
}

// ---- Types ----

interface KNPPacket {
  version: string;
  checksum: string;
  timestamp: number;
  segments: Record<string, string>;
  session_id?: string;
}

type VizType = "BAR" | "LINE" | "TABLE" | "RADAR" | "DASHBOARD";

interface ChartDescriptor {
  chartType: string;
  title: string;
  data: Array<Record<string, unknown>>;
  config: Record<string, unknown>;
}

interface CheckpointData {
  label: string;
  time: string;
  actualScore: number;
  predictedScore: number;
  status: "AMPLIFY" | "MONITOR" | "PAUSE" | "ARCHIVE";
}

// ---- Checkpoint Timeline ----

const CHECKPOINT_LABELS = ["1m", "5m", "15m", "30m", "1h", "2h"];

function getThresholdStatus(score: number): "AMPLIFY" | "MONITOR" | "PAUSE" | "ARCHIVE" {
  if (score >= 0.75) return "AMPLIFY";
  if (score >= 0.50) return "MONITOR";
  if (score >= 0.25) return "PAUSE";
  return "ARCHIVE";
}

function getThresholdColor(status: string): string {
  switch (status) {
    case "AMPLIFY": return "#22c55e";
    case "MONITOR": return "#eab308";
    case "PAUSE":   return "#f97316";
    case "ARCHIVE": return "#ef4444";
    default:        return "#6b7280";
  }
}

// ---- Chart Builders ----

function buildBarChart(data: Record<string, unknown>[], title: string): ChartDescriptor {
  return {
    chartType: "bar",
    title,
    data,
    config: {
      xAxisKey: "name",
      bars: Object.keys(data[0] || {}).filter(k => k !== "name"),
      colors: ["#6b5ce7", "#3b82f6", "#10b981", "#f59e0b"],
      layout: "vertical",
      responsive: true,
    },
  };
}

function buildLineChart(data: Record<string, unknown>[], title: string): ChartDescriptor {
  return {
    chartType: "line",
    title,
    data,
    config: {
      xAxisKey: "time",
      lines: Object.keys(data[0] || {}).filter(k => k !== "time"),
      colors: ["#6b5ce7", "#ef4444"],
      strokeWidth: 2,
      dots: true,
      responsive: true,
    },
  };
}

function buildTableChart(data: Record<string, unknown>[], title: string): ChartDescriptor {
  const columns = Object.keys(data[0] || {});
  return {
    chartType: "table",
    title,
    data,
    config: {
      columns: columns.map(c => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1), sortable: true })),
      highlightRules: [
        { column: "engagement", condition: "gt", value: 5, color: "#22c55e" },
        { column: "engagement", condition: "lt", value: 2, color: "#ef4444" },
      ],
    },
  };
}

function buildRadarChart(data: Record<string, unknown>[], title: string): ChartDescriptor {
  return {
    chartType: "radar",
    title,
    data,
    config: {
      angleKey: "metric",
      radiusKeys: Object.keys(data[0] || {}).filter(k => k !== "metric"),
      colors: ["#6b5ce7", "#ef4444"],
      domain: [0, 100],
      responsive: true,
    },
  };
}

function buildDashboard(sourceData: Record<string, unknown>[]): ChartDescriptor {
  // Composite: wrap multiple mini-charts
  const barData = sourceData.map(d => ({ name: d.name || d.label, value: d.value || d.engagement || 0 }));
  const lineData = sourceData.map((d, i) => ({ time: d.time || `T${i}`, actual: d.actual || 0, predicted: d.predicted || 0 }));

  return {
    chartType: "dashboard",
    title: "Performance Dashboard",
    data: sourceData,
    config: {
      panels: [
        { type: "bar", title: "Engagement Comparison", dataSlice: "bar" },
        { type: "line", title: "Performance Trend", dataSlice: "line" },
        { type: "stat", title: "Key Metrics", metrics: ["engagement_rate", "ctr", "conversion"] },
      ],
      derivedData: { bar: barData, line: lineData },
      responsive: true,
    },
  };
}

// ---- Checkpoint Timeline Builder ----

function buildCheckpointTimeline(checkpoints: CheckpointData[]): ChartDescriptor {
  const data = checkpoints.map(cp => ({
    time: cp.label,
    actual: cp.actualScore,
    predicted: cp.predictedScore,
    status: cp.status,
    fill: getThresholdColor(cp.status),
  }));

  return {
    chartType: "checkpoint_timeline",
    title: "Campaign Performance Arc (6-Checkpoint)",
    data,
    config: {
      xAxisKey: "time",
      lines: [
        { key: "actual", label: "Actual Viral Score", color: "#6b5ce7", strokeWidth: 3 },
        { key: "predicted", label: "Predicted Viral Score", color: "#94a3b8", strokeDasharray: "5 5" },
      ],
      thresholdBands: [
        { min: 0.75, max: 1.0, color: "#22c55e20", label: "AMPLIFY" },
        { min: 0.50, max: 0.75, color: "#eab30820", label: "MONITOR" },
        { min: 0.25, max: 0.50, color: "#f9731620", label: "PAUSE" },
        { min: 0.0, max: 0.25, color: "#ef444420", label: "ARCHIVE" },
      ],
      dots: true,
      responsive: true,
    },
  };
}

// ---- PDF Report Generation ----

async function generatePDFReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  charts: ChartDescriptor[],
  campaignContext: string
): Promise<string | null> {
  try {
    // Build a structured PDF-like text document (server-side PDF rendering)
    // Using a simple text-based report since we can't use pdfkit in Deno edge functions
    const reportLines: string[] = [];
    const timestamp = new Date().toISOString();
    const reportId = crypto.randomUUID();

    // KLYC Brand Header
    reportLines.push("═══════════════════════════════════════════");
    reportLines.push("  KLYC ANALYTICS REPORT");
    reportLines.push("  Campaign Intelligence Platform");
    reportLines.push(`  Generated: ${new Date().toLocaleString()}`);
    reportLines.push("═══════════════════════════════════════════");
    reportLines.push("");
    reportLines.push(`Campaign Context: ${campaignContext}`);
    reportLines.push("");

    for (const chart of charts) {
      reportLines.push(`── ${chart.title} ──`);
      reportLines.push(`Type: ${chart.chartType}`);
      reportLines.push("");

      if (chart.chartType === "table") {
        // Render table data
        const cols = Object.keys(chart.data[0] || {});
        reportLines.push(cols.join(" | "));
        reportLines.push(cols.map(() => "---").join(" | "));
        for (const row of chart.data) {
          reportLines.push(cols.map(c => String(row[c] ?? "")).join(" | "));
        }
      } else {
        // Render data points
        for (const point of chart.data) {
          reportLines.push(
            Object.entries(point)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          );
        }
      }
      reportLines.push("");
    }

    reportLines.push("═══════════════════════════════════════════");
    reportLines.push("  End of Report — KLYC Intelligence Engine");
    reportLines.push("═══════════════════════════════════════════");

    const reportContent = reportLines.join("\n");
    const reportBlob = new TextEncoder().encode(reportContent);
    const filePath = `${userId}/${reportId}.txt`;

    const { error } = await supabase.storage
      .from("analytics-reports")
      .upload(filePath, reportBlob, {
        contentType: "text/plain",
        upsert: false,
      });

    if (error) {
      console.error("PDF upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("analytics-reports")
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.error("Report generation error:", e);
    return null;
  }
}

// ---- Data Parsing ----

function parseSourceData(raw: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
    return [parsed];
  } catch {
    // Try to parse as KNP-style delimited data
    return [{ raw: raw, value: 0 }];
  }
}

function parseVizType(raw: string): VizType | null {
  if (!raw || raw === KNP_NULL_MARKER) return null;
  const types = raw.split(KNP_VALUE_JOINER);
  const first = types[0]?.toUpperCase();
  if (["BAR", "LINE", "TABLE", "RADAR", "DASHBOARD"].includes(first)) {
    return first as VizType;
  }
  return null;
}

// ---- Fetch Checkpoints from DB ----

async function fetchCheckpoints(
  supabase: ReturnType<typeof createClient>,
  campaignId: string
): Promise<CheckpointData[]> {
  const { data, error } = await supabase
    .from("campaign_checkpoints")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("checkpoint_time", { ascending: true });

  if (error || !data || data.length === 0) {
    // Return sample checkpoint data for demo
    return CHECKPOINT_LABELS.map((label, i) => {
      const actual = Math.random() * 0.6 + 0.2;
      const predicted = actual + (Math.random() - 0.5) * 0.2;
      return {
        label,
        time: new Date(Date.now() - (5 - i) * 300000).toISOString(),
        actualScore: Math.round(actual * 100) / 100,
        predictedScore: Math.round(Math.max(0, Math.min(1, predicted)) * 100) / 100,
        status: getThresholdStatus(actual),
      };
    });
  }

  return data.map((row: Record<string, unknown>) => ({
    label: String(row.checkpoint_label),
    time: String(row.checkpoint_time),
    actualScore: Number(row.actual_viral_score) || 0,
    predictedScore: Number(row.predicted_viral_score) || 0,
    status: getThresholdStatus(Number(row.actual_viral_score) || 0),
  }));
}

// ---- Main Handler ----

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // ---- Health Check ----
    if (body.action === "health") {
      return new Response(
        JSON.stringify({
          version: "2.0-knp",
          submind: "analytics",
          status: "operational",
          features: [
            "bar_chart", "line_chart", "table", "radar_chart", "dashboard",
            "checkpoint_timeline", "pdf_report", "format_resolution",
          ],
          knp_version: KNP_VERSION,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Parse KNP Payload ----
    // Accept either a KNP packet or raw body with segments
    let segments: Record<string, string> = {};
    let sessionId = "";

    if (body.segments) {
      segments = body.segments;
      sessionId = body.session_id || "";
    } else if (body.version === KNP_VERSION) {
      // Flat KNP object
      for (const [k, v] of Object.entries(body)) {
        if (!["version", "checksum", "timestamp", "session_id", "action"].includes(k)) {
          segments[k] = String(v);
        }
      }
      sessionId = body.session_id || "";
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid KNP payload. Analytics only speaks KNP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    // Extract fields
    const sourceData = segments[KNP.σo] || KNP_NULL_MARKER;
    const vizTypeRaw = segments[KNP.θc] || KNP_NULL_MARKER;
    const timeRange = segments[KNP.πf] || KNP_NULL_MARKER;
    const contextId = segments[KNP.ξb] || KNP_NULL_MARKER;

    // ---- Format Ambiguity Resolution ----
    const vizType = parseVizType(vizTypeRaw);

    if (!vizType) {
      // θc was ∅ or unrecognized — return FORMAT_REQUEST
      const responseSegments: Record<string, string> = {
        [KNP.σo]: KNP_NULL_MARKER,
        [KNP.θc]: `FORMAT_REQUEST${KNP_NULL_MARKER}`,
        [KNP.πf]: KNP_NULL_MARKER,
      };

      return new Response(
        JSON.stringify({
          version: KNP_VERSION,
          submind: "analytics",
          status: "awaiting_input",
          checksum: knpChecksum(responseSegments),
          timestamp: Date.now(),
          session_id: sessionId,
          segments: responseSegments,
          format_prompt: "How would you like to see this data? (1) Side-by-side bar chart (2) Trend line over time (3) Comparison table (4) Radar chart (5) Full dashboard (6) Something else: ___",
          elapsed_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Parse Source Data ----
    const dataPoints = parseSourceData(sourceData);

    // ---- Build Visualization ----
    const charts: ChartDescriptor[] = [];
    const title = `Analytics: ${contextId !== KNP_NULL_MARKER ? contextId : "Campaign"}`;

    switch (vizType) {
      case "BAR":
        charts.push(buildBarChart(dataPoints, title));
        break;
      case "LINE":
        charts.push(buildLineChart(dataPoints, title));
        break;
      case "TABLE":
        charts.push(buildTableChart(dataPoints, title));
        break;
      case "RADAR":
        charts.push(buildRadarChart(dataPoints, title));
        break;
      case "DASHBOARD": {
        charts.push(buildDashboard(dataPoints));
        // Also fetch checkpoint timeline if campaign_id available
        if (contextId !== KNP_NULL_MARKER) {
          const checkpoints = await fetchCheckpoints(supabase, contextId);
          charts.push(buildCheckpointTimeline(checkpoints));
        }
        break;
      }
    }

    // ---- Invoke Learning Engine for checkpoint data ----
    if (vizType === "DASHBOARD" && contextId !== KNP_NULL_MARKER) {
      try {
        const checkpoints = await fetchCheckpoints(supabase, contextId);
        for (const cp of checkpoints) {
          if (cp.actualScore > 0 && cp.predictedScore > 0) {
            await supabase.functions.invoke("learning-engine", {
              body: {
                trigger: "checkpoint",
                payload: {
                  client_id: contextId,
                  campaign_id: contextId,
                  actual_score: cp.actualScore,
                  predicted_score: cp.predictedScore,
                  checkpoint_label: cp.label,
                },
              },
            });
          }
        }
      } catch (e) {
        console.warn("Learning engine checkpoint dispatch failed:", e);
      }
    }
    let pdfUrl: string | null = null;
    const wantsPdf = timeRange.toLowerCase().includes("pdf") ||
                     sourceData.toLowerCase().includes("pdf") ||
                     vizTypeRaw.toLowerCase().includes("pdf");

    if (wantsPdf) {
      // Extract user_id from auth header if available
      const authHeader = req.headers.get("Authorization");
      let userId = "anonymous";
      if (authHeader) {
        try {
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
          const userClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: userData } = await userClient.auth.getUser();
          if (userData?.user?.id) userId = userData.user.id;
        } catch { /* use anonymous */ }
      }
      pdfUrl = await generatePDFReport(supabase, userId, charts, contextId);
    }

    // ---- Build KNP Response ----
    const vizDescriptor = JSON.stringify(charts.length === 1 ? charts[0] : charts);
    const compressed = vizDescriptor.slice(0, 250);

    const responseSegments: Record<string, string> = {
      [KNP.σo]: compressed,
      [KNP.θc]: vizType,
      [KNP.πf]: pdfUrl || KNP_NULL_MARKER,
    };

    const elapsed = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "analytics",
        status: "complete",
        checksum: knpChecksum(responseSegments),
        timestamp: Date.now(),
        session_id: sessionId,
        segments: responseSegments,
        // Full descriptor for the frontend (not compressed)
        visualization: charts.length === 1 ? charts[0] : charts,
        pdf_url: pdfUrl,
        elapsed_ms: elapsed,
        token_tracking: {
          submind: "analytics",
          input_chars: sourceData.length + vizTypeRaw.length,
          output_chars: vizDescriptor.length,
          compressed_chars: compressed.length,
          elapsed_ms: elapsed,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analytics submind error:", error);
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "analytics",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown analytics error",
        segments: {
          [KNP.σo]: KNP_NULL_MARKER,
          [KNP.θc]: KNP_NULL_MARKER,
          [KNP.πf]: KNP_NULL_MARKER,
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
