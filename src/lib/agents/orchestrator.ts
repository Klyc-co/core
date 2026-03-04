import { supabase } from "@/integrations/supabase/client";
import type {
  AgentRole,
  AgentMetricsOutput,
  ResearchAgentInput,
  SocialAgentInput,
  ImageAgentInput,
  EditorAgentInput,
  AnalyticsAgentInput,
} from "./types";
import { computeResearchMetrics } from "./researchAgent";
import { computeSocialMetrics } from "./socialAgent";
import { computeImageMetrics } from "./imageAgent";
import { computeEditorMetrics } from "./editorAgent";
import { computeAnalyticsMetrics } from "./analyticsAgent";

// ============================================================
// KLYC Metrics Orchestrator
// Aggregates metrics across all agents and provides
// parameterized analytics queries.
// ============================================================

export interface OrchestratorMetricsReport {
  clientId: string;
  agentReports: AgentMetricsOutput[];
  overallScore: number;
  criticalActions: AgentMetricsOutput["recommended_actions"];
  generatedAt: string;
}

/**
 * Run all agent metric calculators and produce a unified report.
 */
export function aggregateAgentMetrics(
  clientId: string,
  inputs: {
    research?: ResearchAgentInput;
    social?: SocialAgentInput;
    image?: ImageAgentInput;
    editor?: EditorAgentInput;
    analytics?: AnalyticsAgentInput;
  }
): OrchestratorMetricsReport {
  const reports: AgentMetricsOutput[] = [];

  if (inputs.research) reports.push(computeResearchMetrics(inputs.research));
  if (inputs.social) reports.push(computeSocialMetrics(inputs.social));
  if (inputs.image) reports.push(computeImageMetrics(inputs.image));
  if (inputs.editor) reports.push(computeEditorMetrics(inputs.editor));
  if (inputs.analytics) reports.push(computeAnalyticsMetrics(inputs.analytics));

  // Overall score: average of all metric values
  const allValues = reports.flatMap((r) => r.metrics.map((m) => m.value));
  const overallScore = allValues.length > 0
    ? allValues.reduce((a, b) => a + b, 0) / allValues.length
    : 0;

  // Bubble up all high-priority actions
  const criticalActions = reports.flatMap((r) =>
    r.recommended_actions.filter((a) => a.priority === "high")
  );

  return {
    clientId,
    agentReports: reports,
    overallScore: Math.round(overallScore * 1000) / 1000,
    criticalActions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Execute a predefined analytics query using the Supabase client.
 * This uses typed client APIs — no raw SQL execution.
 */
export async function queryAnalytics(
  metric: "engagement_rate" | "ctr" | "saves" | "shares" | "reach",
  filters: { userId: string; campaignId?: string; platform?: string; daysBack?: number }
) {
  const since = new Date(Date.now() - (filters.daysBack || 30) * 86400000).toISOString();

  let query = supabase
    .from("post_analytics")
    .select("platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate, fetched_at")
    .gte("fetched_at", since);

  if (filters.platform) {
    query = query.eq("platform", filters.platform);
  }

  const { data, error } = await query.order("fetched_at", { ascending: false }).limit(100);

  if (error) {
    console.error("Analytics query failed:", error);
    return { data: null, error: error.message };
  }

  // Compute the requested metric aggregate
  const records = data || [];
  switch (metric) {
    case "engagement_rate": {
      const rates = records.map((r) => r.engagement_rate).filter(Boolean) as number[];
      return { data: { metric, value: avg(rates), count: rates.length, records }, error: null };
    }
    case "ctr": {
      const totalClicks = sum(records, "clicks");
      const totalImpressions = sum(records, "impressions");
      return { data: { metric, value: totalImpressions > 0 ? totalClicks / totalImpressions : 0, count: records.length }, error: null };
    }
    case "saves":
      return { data: { metric, value: sum(records, "saves"), count: records.length }, error: null };
    case "shares":
      return { data: { metric, value: sum(records, "shares"), count: records.length }, error: null };
    case "reach":
      return { data: { metric, value: sum(records, "reach"), count: records.length }, error: null };
    default:
      return { data: null, error: `Unknown metric: ${metric}` };
  }
}

/**
 * Generate a dashboard-ready metrics snapshot for a client.
 */
export async function generateDashboardSnapshot(userId: string) {
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();

  const [analyticsRes, postsRes, draftsRes] = await Promise.all([
    supabase
      .from("post_analytics")
      .select("platform, views, likes, comments, shares, saves, clicks, impressions, reach, engagement_rate")
      .gte("fetched_at", since30d),
    supabase
      .from("post_queue")
      .select("status, content_type, created_at")
      .eq("user_id", userId)
      .gte("created_at", since30d),
    supabase
      .from("campaign_drafts")
      .select("id, content_type, tags, created_at")
      .eq("user_id", userId)
      .gte("created_at", since30d),
  ]);

  const analytics = analyticsRes.data || [];
  const posts = postsRes.data || [];
  const drafts = draftsRes.data || [];

  // Platform breakdown
  const platforms: Record<string, { views: number; likes: number; engagement: number; count: number }> = {};
  for (const a of analytics) {
    const p = a.platform;
    if (!platforms[p]) platforms[p] = { views: 0, likes: 0, engagement: 0, count: 0 };
    platforms[p].views += a.views || 0;
    platforms[p].likes += a.likes || 0;
    platforms[p].engagement += a.engagement_rate || 0;
    platforms[p].count++;
  }

  return {
    period: "last_30_days",
    totalPosts: posts.length,
    totalDrafts: drafts.length,
    postsByStatus: countBy(posts, "status"),
    postsByType: countBy(posts, "content_type"),
    platformBreakdown: Object.entries(platforms).map(([platform, m]) => ({
      platform,
      totalViews: m.views,
      totalLikes: m.likes,
      avgEngagementRate: m.count > 0 ? Math.round((m.engagement / m.count) * 1000) / 1000 : 0,
      postCount: m.count,
    })),
    topTags: countTags(drafts),
    generatedAt: new Date().toISOString(),
  };
}

// ---- Helpers ----

function sum(records: any[], key: string): number {
  return records.reduce((s, r) => s + (r[key] || 0), 0);
}

function avg(nums: number[]): number {
  return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 1000) / 1000 : 0;
}

function countBy(items: any[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const val = item[key] || "unknown";
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function countTags(drafts: any[]): Array<{ tag: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const d of drafts) {
    for (const tag of d.tags || []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
}
