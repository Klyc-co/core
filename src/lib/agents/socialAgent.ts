import type {
  SubmindMetricsOutput,
  SubmindMetric,
  RecommendedAction,
  SocialSubmindInput,
} from "./types";

/**
 * Social Agent — evaluates caption quality and predicts engagement.
 */
export function computeSocialMetrics(input: SocialSubmindInput): SubmindMetricsOutput {
  const metrics: SubmindMetric[] = [];
  const actions: RecommendedAction[] = [];
  const caption = input.postCaption || "";

  // ── Hook Strength Score ──
  const hookScore = evaluateHook(caption);
  metrics.push({
    metric: "hook_strength_score",
    value: round(hookScore),
    unit: "0-1 scale",
    sql_query: `SELECT post_text, status FROM post_queue WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
  });

  if (hookScore < 0.5) {
    actions.push({
      priority: "high",
      action: "Strengthen the opening hook — use a question, bold stat, or pattern interrupt",
      reason: `Hook score is ${round(hookScore)}, below the 0.5 threshold for scroll-stopping content.`,
    });
  }

  // ── Readability Score ──
  const readability = computeReadability(caption);
  metrics.push({
    metric: "readability_score",
    value: round(readability),
    unit: "0-1 scale",
    sql_query: `SELECT post_text FROM post_queue WHERE user_id = $1 AND status = 'published' ORDER BY published_at DESC LIMIT 20`,
  });

  if (readability < 0.5) {
    actions.push({
      priority: "medium",
      action: "Simplify sentence structure — aim for shorter sentences and common words",
      reason: `Readability is ${round(readability)}, indicating complex language that may reduce engagement.`,
    });
  }

  // ── Engagement Prediction ──
  const predicted = predictEngagement(hookScore, readability, input.historicalEngagementRate);
  metrics.push({
    metric: "engagement_prediction",
    value: round(predicted),
    unit: "predicted rate",
    sql_query: `SELECT AVG(engagement_rate) as avg_rate FROM post_analytics WHERE platform = '${input.platform}' AND post_queue_id IN (SELECT id FROM post_queue WHERE user_id = $1)`,
  });

  if (predicted < input.historicalEngagementRate * 0.8) {
    actions.push({
      priority: "high",
      action: "Predicted engagement is below historical average — consider revising caption or visual",
      reason: `Predicted ${round(predicted)} vs historical ${round(input.historicalEngagementRate)}.`,
    });
  }

  // ── Emoji Density ──
  const emojiCount = (caption.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  const emojiDensity = caption.length > 0 ? emojiCount / (caption.length / 100) : 0;
  metrics.push({
    metric: "emoji_density",
    value: round(emojiDensity),
    unit: "per 100 chars",
    sql_query: `SELECT post_text FROM post_queue WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
  });

  return {
    submindRole: "social",
    metrics,
    recommended_actions: actions,
    generatedAt: new Date().toISOString(),
  };
}

function evaluateHook(caption: string): number {
  if (!caption) return 0;
  let score = 0.3; // baseline
  const firstLine = caption.split("\n")[0] || "";

  // Questions score higher
  if (firstLine.includes("?")) score += 0.15;
  // Numbers / stats
  if (/\d+/.test(firstLine)) score += 0.1;
  // Short punchy hooks (under 60 chars)
  if (firstLine.length > 0 && firstLine.length <= 60) score += 0.15;
  // ALL CAPS pattern interrupt
  if (/[A-Z]{3,}/.test(firstLine)) score += 0.1;
  // Emoji in hook
  if (/[\u{1F300}-\u{1FAFF}]/u.test(firstLine)) score += 0.1;
  // Power words
  const powerWords = ["secret", "proven", "free", "instant", "exclusive", "shocking", "truth", "hack", "mistake", "stop"];
  if (powerWords.some((w) => firstLine.toLowerCase().includes(w))) score += 0.1;

  return Math.min(1, score);
}

function computeReadability(text: string): number {
  if (!text) return 0;
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : words.length;
  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / words.length;

  // Ideal: 8-15 words per sentence, 4-6 chars per word
  const sentenceScore = Math.max(0, 1 - Math.abs(avgWordsPerSentence - 12) / 20);
  const wordScore = Math.max(0, 1 - Math.abs(avgWordLength - 5) / 8);

  return Math.min(1, (sentenceScore + wordScore) / 2);
}

function predictEngagement(hookScore: number, readability: number, historicalRate: number): number {
  // Weighted blend: hook quality matters most, then readability, anchored to historical performance
  const predicted = historicalRate * (0.4 + hookScore * 0.35 + readability * 0.25);
  return Math.max(0, predicted);
}

function round(n: number, decimals = 3): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
