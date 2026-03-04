import type {
  AgentMetricsOutput,
  AgentMetric,
  RecommendedAction,
  ImageAgentInput,
} from "./types";

/**
 * Image Agent — evaluates visual quality signals for social content.
 */
export function computeImageMetrics(input: ImageAgentInput): AgentMetricsOutput {
  const metrics: AgentMetric[] = [];
  const actions: RecommendedAction[] = [];

  // ── Visual Clarity Score ──
  const clarityScore = evaluateClarity(input);
  metrics.push({
    metric: "visual_clarity_score",
    value: round(clarityScore),
    unit: "0-1 scale",
    sql_query: `SELECT asset_name, asset_type, metadata FROM brand_assets WHERE user_id = $1 AND asset_type = 'image'`,
  });

  if (clarityScore < 0.5) {
    actions.push({
      priority: "high",
      action: "Improve image resolution or reduce visual clutter",
      reason: `Clarity score is ${round(clarityScore)} — low resolution or missing image data.`,
    });
  }

  // ── Thumbnail Attention Score ──
  const attentionScore = evaluateThumbnailAttention(input);
  metrics.push({
    metric: "thumbnail_attention_score",
    value: round(attentionScore),
    unit: "0-1 scale",
    sql_query: `SELECT image_url, content_type FROM post_queue WHERE user_id = $1 AND image_url IS NOT NULL ORDER BY created_at DESC LIMIT 10`,
  });

  if (attentionScore < 0.5) {
    actions.push({
      priority: "medium",
      action: "Add high-contrast elements or text overlay to boost thumbnail visibility",
      reason: `Attention score is ${round(attentionScore)}, suggesting the thumbnail may not stand out in feeds.`,
    });
  }

  // ── Color Contrast Score ──
  const contrastScore = evaluateColorContrast(input.dominantColors);
  metrics.push({
    metric: "color_contrast_score",
    value: round(contrastScore),
    unit: "0-1 scale",
    sql_query: `SELECT name, value FROM brand_assets WHERE user_id = $1 AND asset_type = 'color'`,
  });

  if (contrastScore < 0.4) {
    actions.push({
      priority: "low",
      action: "Increase color contrast between foreground and background elements",
      reason: `Low color diversity may reduce visual impact.`,
    });
  }

  // ── Platform Size Compliance ──
  const sizeCompliance = checkPlatformSizeCompliance(input);
  metrics.push({
    metric: "platform_size_compliance",
    value: sizeCompliance,
    unit: "0 or 1",
    sql_query: `SELECT metadata FROM product_assets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
  });

  if (sizeCompliance < 1) {
    actions.push({
      priority: "high",
      action: `Resize image to match ${input.platform} recommended dimensions`,
      reason: "Current resolution doesn't match platform optimal specs.",
    });
  }

  return {
    agentRole: "image",
    metrics,
    recommended_actions: actions,
    generatedAt: new Date().toISOString(),
  };
}

function evaluateClarity(input: ImageAgentInput): number {
  if (!input.imageUrl) return 0;
  let score = 0.5; // baseline for having an image

  if (input.resolution) {
    const megapixels = (input.resolution.width * input.resolution.height) / 1_000_000;
    if (megapixels >= 2) score += 0.3;
    else if (megapixels >= 1) score += 0.2;
    else if (megapixels >= 0.5) score += 0.1;
  }

  if (!input.hasText) score += 0.1; // clean images without overlaid text score slightly higher for clarity
  if (input.dominantColors.length >= 2) score += 0.1;

  return Math.min(1, score);
}

function evaluateThumbnailAttention(input: ImageAgentInput): number {
  let score = 0.3;

  // Text on thumbnail helps attention
  if (input.hasText) score += 0.2;
  // High contrast colors
  if (input.dominantColors.length >= 3) score += 0.15;
  // High res
  if (input.resolution && input.resolution.width >= 1080) score += 0.15;
  // Bright/saturated colors boost attention
  const hasBright = input.dominantColors.some((c) => {
    const hex = c.replace("#", "");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return Math.max(r, g, b) > 200;
  });
  if (hasBright) score += 0.2;

  return Math.min(1, score);
}

function evaluateColorContrast(colors: string[]): number {
  if (colors.length < 2) return 0.3;
  // Simple heuristic: more unique colors = higher contrast potential
  const unique = new Set(colors.map((c) => c.toLowerCase()));
  return Math.min(1, 0.3 + (unique.size - 1) * 0.15);
}

function checkPlatformSizeCompliance(input: ImageAgentInput): number {
  if (!input.resolution) return 0;

  const specs: Record<string, { width: number; height: number }[]> = {
    instagram: [{ width: 1080, height: 1080 }, { width: 1080, height: 1350 }, { width: 1080, height: 1920 }],
    tiktok: [{ width: 1080, height: 1920 }],
    twitter: [{ width: 1200, height: 675 }, { width: 1080, height: 1080 }],
    linkedin: [{ width: 1200, height: 627 }, { width: 1080, height: 1080 }],
    facebook: [{ width: 1200, height: 630 }, { width: 1080, height: 1080 }],
    youtube: [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }],
  };

  const platformSpecs = specs[input.platform] || specs.instagram;
  const { width, height } = input.resolution;

  for (const spec of platformSpecs) {
    const widthRatio = width / spec.width;
    const heightRatio = height / spec.height;
    if (widthRatio >= 0.9 && widthRatio <= 1.1 && heightRatio >= 0.9 && heightRatio <= 1.1) {
      return 1;
    }
  }
  return 0;
}

function round(n: number, decimals = 3): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
