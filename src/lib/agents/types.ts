// ============================================================
// KLYC Submind Metrics — Shared Type System
// ============================================================

/** Every metric output by a submind conforms to this shape. */
export interface SubmindMetric {
  metric: string;
  value: number;
  unit?: string;
  /** A parameterized query description subminds can surface for dashboard generation. */
  sql_query: string;
}

/** A concrete action the submind recommends based on its metrics. */
export interface RecommendedAction {
  priority: "high" | "medium" | "low";
  action: string;
  reason: string;
}

/** Standard output every submind must produce. */
export interface SubmindMetricsOutput {
  submindRole: SubmindRole;
  metrics: SubmindMetric[];
  recommended_actions: RecommendedAction[];
  generatedAt: string;
}

export type SubmindRole =
  | "research"
  | "social"
  | "image"
  | "editor"
  | "analytics";

// ---- Backward-compatible aliases ----
export type AgentRole = SubmindRole;
export type AgentMetric = SubmindMetric;
export type AgentMetricsOutput = SubmindMetricsOutput;

// ---- Per-submind input contracts ----

export interface ResearchSubmindInput {
  trendScores: Array<{ trendName: string; platform: string; volume: string | null; rank: number | null }>;
  competitors: Array<{ name: string; analyzedAt: string; hasSwot: boolean }>;
  totalCompetitorCount: number;
}

export interface SocialSubmindInput {
  postCaption: string;
  platform: string;
  historicalEngagementRate: number;
  avgLikes: number;
  avgComments: number;
}

export interface ImageSubmindInput {
  imageUrl: string | null;
  hasText: boolean;
  dominantColors: string[];
  resolution: { width: number; height: number } | null;
  platform: string;
}

export interface EditorSubmindInput {
  postText: string;
  platform: string;
  mediaUrls: string[];
  hashtags: string[];
}

export interface AnalyticsSubmindInput {
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

// ---- Backward-compatible input aliases ----
export type ResearchAgentInput = ResearchSubmindInput;
export type SocialAgentInput = SocialSubmindInput;
export type ImageAgentInput = ImageSubmindInput;
export type EditorAgentInput = EditorSubmindInput;
export type AnalyticsAgentInput = AnalyticsSubmindInput;

// ---- Platform constraints used by editor submind ----

export const PLATFORM_LIMITS: Record<string, { maxChars: number; maxHashtags: number; maxMedia: number; formats: string[] }> = {
  twitter: { maxChars: 280, maxHashtags: 5, maxMedia: 4, formats: ["jpg", "png", "gif", "mp4"] },
  instagram: { maxChars: 2200, maxHashtags: 30, maxMedia: 10, formats: ["jpg", "png", "mp4"] },
  linkedin: { maxChars: 3000, maxHashtags: 5, maxMedia: 9, formats: ["jpg", "png", "gif", "mp4"] },
  tiktok: { maxChars: 2200, maxHashtags: 10, maxMedia: 1, formats: ["mp4"] },
  facebook: { maxChars: 63206, maxHashtags: 10, maxMedia: 10, formats: ["jpg", "png", "gif", "mp4"] },
  youtube: { maxChars: 5000, maxHashtags: 15, maxMedia: 1, formats: ["mp4"] },
};
