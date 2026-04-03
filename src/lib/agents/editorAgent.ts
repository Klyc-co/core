import type {
  SubmindMetricsOutput,
  SubmindMetric,
  RecommendedAction,
  EditorSubmindInput,
} from "./types";
import { PLATFORM_LIMITS as LIMITS } from "./types";

/**
 * Editor / Publisher Agent — validates platform formatting and compliance.
 */
export function computeEditorMetrics(input: EditorAgentInput): AgentMetricsOutput {
  const metrics: AgentMetric[] = [];
  const actions: RecommendedAction[] = [];
  const limits = LIMITS[input.platform] || LIMITS.instagram;

  // ── Character Limit Compliance ──
  const charRatio = input.postText.length / limits.maxChars;
  const charCompliance = charRatio <= 1 ? 1 : 0;
  metrics.push({
    metric: "character_limit_compliance",
    value: charCompliance,
    unit: "0 or 1",
    sql_query: `SELECT post_text, LENGTH(post_text) as char_count FROM post_queue WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
  });

  if (charCompliance === 0) {
    actions.push({
      priority: "high",
      action: `Reduce caption by ${input.postText.length - limits.maxChars} characters for ${input.platform}`,
      reason: `Caption is ${input.postText.length} chars, limit is ${limits.maxChars}.`,
    });
  }

  // ── Character Utilization ──
  const utilization = Math.min(1, input.postText.length / limits.maxChars);
  metrics.push({
    metric: "character_utilization",
    value: round(utilization),
    unit: "0-1 scale",
    sql_query: `SELECT LENGTH(post_text) as length FROM post_queue WHERE user_id = $1 AND status = 'published'`,
  });

  if (utilization < 0.2 && input.platform !== "twitter") {
    actions.push({
      priority: "low",
      action: "Consider expanding caption — very short posts may underperform on this platform",
      reason: `Only using ${Math.round(utilization * 100)}% of available character space.`,
    });
  }

  // ── Hashtag Compliance ──
  const hashtagCount = input.hashtags.length;
  const hashtagCompliance = hashtagCount <= limits.maxHashtags ? 1 : 0;
  metrics.push({
    metric: "hashtag_compliance",
    value: hashtagCompliance,
    unit: "0 or 1",
    sql_query: `SELECT post_text FROM post_queue WHERE user_id = $1 AND post_text LIKE '%#%' ORDER BY created_at DESC LIMIT 10`,
  });

  if (hashtagCompliance === 0) {
    actions.push({
      priority: "medium",
      action: `Remove ${hashtagCount - limits.maxHashtags} hashtags — ${input.platform} allows max ${limits.maxHashtags}`,
      reason: `${hashtagCount} hashtags exceeds platform limit.`,
    });
  }

  // ── Media Count Compliance ──
  const mediaCompliance = input.mediaUrls.length <= limits.maxMedia ? 1 : 0;
  metrics.push({
    metric: "media_count_compliance",
    value: mediaCompliance,
    unit: "0 or 1",
    sql_query: `SELECT media_urls, image_url, video_url FROM post_queue WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
  });

  if (mediaCompliance === 0) {
    actions.push({
      priority: "high",
      action: `Reduce to ${limits.maxMedia} media items for ${input.platform}`,
      reason: `${input.mediaUrls.length} media items exceeds platform max of ${limits.maxMedia}.`,
    });
  }

  // ── Platform Formatting Score (composite) ──
  const formattingScore = (charCompliance + hashtagCompliance + mediaCompliance) / 3;
  metrics.push({
    metric: "platform_formatting_compliance",
    value: round(formattingScore),
    unit: "0-1 scale",
    sql_query: `SELECT content_type, status, error_message FROM post_queue WHERE user_id = $1 AND status IN ('failed', 'published') ORDER BY created_at DESC`,
  });

  return {
    agentRole: "editor",
    metrics,
    recommended_actions: actions,
    generatedAt: new Date().toISOString(),
  };
}

function round(n: number, decimals = 3): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
