import { loadBrainDocument, saveBrainDocument, type ApprovalExample, type ExamplesCache } from "./clientBrain";

const MAX_EXAMPLES = 100; // cap per list to prevent unbounded growth

export interface ApprovalDecision {
  content_id: string;
  decision: "approved" | "rejected";
  platform?: string;
  structure?: string;
  content_preview?: string;
  reason?: string;
}

/**
 * Record an approval or rejection into the client's brain examples_cache.
 * Agents use this memory to learn from past decisions.
 */
export async function recordApprovalDecision(
  clientId: string,
  decision: ApprovalDecision
): Promise<boolean> {
  // Load existing cache
  const existing = await loadBrainDocument(clientId, "examples_cache") as ExamplesCache | null;
  const cache: ExamplesCache = existing ?? { approvedExamples: [], rejectedExamples: [] };

  if (!cache.approvedExamples) cache.approvedExamples = [];
  if (!cache.rejectedExamples) cache.rejectedExamples = [];

  const entry: ApprovalExample = {
    content_id: decision.content_id,
    decision: decision.decision,
    platform: decision.platform,
    structure: decision.structure,
    content_preview: decision.content_preview?.slice(0, 500),
    reason: decision.decision === "rejected" ? decision.reason : undefined,
    date: new Date().toISOString(),
  };

  if (decision.decision === "approved") {
    // Deduplicate by content_id
    cache.approvedExamples = cache.approvedExamples.filter(
      (e) => e.content_id !== decision.content_id
    );
    cache.approvedExamples.unshift(entry);
    // Cap size — keep most recent
    if (cache.approvedExamples.length > MAX_EXAMPLES) {
      cache.approvedExamples = cache.approvedExamples.slice(0, MAX_EXAMPLES);
    }
  } else {
    cache.rejectedExamples = cache.rejectedExamples.filter(
      (e) => e.content_id !== decision.content_id
    );
    cache.rejectedExamples.unshift(entry);
    if (cache.rejectedExamples.length > MAX_EXAMPLES) {
      cache.rejectedExamples = cache.rejectedExamples.slice(0, MAX_EXAMPLES);
    }
  }

  return saveBrainDocument(clientId, "examples_cache", cache);
}

/**
 * Load approval patterns for agent consumption.
 * Returns a summary agents can use to adjust their outputs.
 */
export async function loadApprovalPatterns(clientId: string): Promise<{
  approvedCount: number;
  rejectedCount: number;
  preferredPlatforms: string[];
  preferredStructures: string[];
  commonRejectionReasons: string[];
  recentApproved: ApprovalExample[];
  recentRejected: ApprovalExample[];
}> {
  const cache = (await loadBrainDocument(clientId, "examples_cache")) as ExamplesCache | null;
  const approved = cache?.approvedExamples ?? [];
  const rejected = cache?.rejectedExamples ?? [];

  // Count platform preferences from approved content
  const platformCounts: Record<string, number> = {};
  const structureCounts: Record<string, number> = {};
  for (const ex of approved) {
    if (ex.platform) platformCounts[ex.platform] = (platformCounts[ex.platform] || 0) + 1;
    if (ex.structure) structureCounts[ex.structure] = (structureCounts[ex.structure] || 0) + 1;
  }

  // Extract rejection reasons
  const reasonCounts: Record<string, number> = {};
  for (const ex of rejected) {
    if (ex.reason) {
      const normalized = ex.reason.toLowerCase().trim();
      reasonCounts[normalized] = (reasonCounts[normalized] || 0) + 1;
    }
  }

  const sortedPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
  const sortedStructures = Object.entries(structureCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const sortedReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([r]) => r);

  return {
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    preferredPlatforms: sortedPlatforms.slice(0, 5),
    preferredStructures: sortedStructures.slice(0, 5),
    commonRejectionReasons: sortedReasons,
    recentApproved: approved.slice(0, 10),
    recentRejected: rejected.slice(0, 10),
  };
}
