// ============================================================
// KLYC Agent Metrics — Shared Type System
// ============================================================

/** Every metric output by an agent conforms to this shape. */
export interface AgentMetric {
  metric: string;
  value: number;
  unit?: string;
  /** A parameterized query description agents can surface for dashboard generation. */
  sql_query: string;
}

/** A concrete action the agent recommends based on its metrics. */
export interface RecommendedAction {
  priority: "high" | "medium" | "low";
  action: string;
  reason: string;
}

/** Standard output every agent must produce. */
export interface AgentMetricsOutput {
  agentRole: AgentRole;
  metrics: AgentMetric[];
  recommended_actions: RecommendedAction[];
  generatedAt: string;
}

export type AgentRole =
  | "research"
  | "social"
  | "image"
  | "editor"
  | "analytics";

// ---- Per-agent input contracts ----

export interface ResearchAgentInput {
  trendScores: Array<{ trendName: string; platform: string; volume: string | null; rank: number | null }>;
  competitors: Array<{ name: string; analyzedAt: string; hasSwot: boolean }>;
  totalCompetitorCount: number;
}

export interface SocialAgentInput {
  postCaption: string;
  platform: string;
  historicalEngagementRate: number;
  avgLikes: number;
  avgComments: number;
}

export interface ImageAgentInput {
  imageUrl: string | null;
  hasText: boolean;
  dominantColors: string[];
  resolution: { width: number; height: number } | null;
  platform: string;
}

export interface EditorAgentInput {
  postText: string;
  platform: string;
  mediaUrls: string[];
  hashtags: string[];
}

export interface AnalyticsAgentInput {
  campaignId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  impressions: number;
  reach: number;
}

// ---- Platform constraints used by editor agent ----

export const PLATFORM_LIMITS: Record<string, { maxChars: number; maxHashtags: number; maxMedia: number; formats: string[] }> = {
  twitter: { maxChars: 280, maxHashtags: 5, maxMedia: 4, formats: ["jpg", "png", "gif", "mp4"] },
  instagram: { maxChars: 2200, maxHashtags: 30, maxMedia: 10, formats: ["jpg", "png", "mp4"] },
  linkedin: { maxChars: 3000, maxHashtags: 5, maxMedia: 9, formats: ["jpg", "png", "gif", "mp4"] },
  tiktok: { maxChars: 2200, maxHashtags: 10, maxMedia: 1, formats: ["mp4"] },
  facebook: { maxChars: 63206, maxHashtags: 10, maxMedia: 10, formats: ["jpg", "png", "gif", "mp4"] },
  youtube: { maxChars: 5000, maxHashtags: 15, maxMedia: 1, formats: ["mp4"] },
};
