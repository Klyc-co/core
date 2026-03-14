/** Run Status types for the KLYC workflow status panel */

export type RunStatusVerdict = "ready" | "blocked" | "low_confidence" | "needs_refresh";

export interface RunStatusData {
  /** Run metadata */
  clientId: string;
  clientName: string;
  runTimestamp: string | null;
  workflowVersion: string;
  status: "idle" | "running" | "complete" | "error";

  /** Normalization checksum */
  contextCoverage: number;
  confidenceScore: number;
  missingInputsCount: number;
  warningsCount: number;
  sourceCount: number;
  compressionNotesCount: number;

  /** Next actions */
  requiresResearch: boolean;
  requiresProductPositioning: boolean;
  requiresNarrativeSimulation: boolean;
  requiresPlatformEvaluation: boolean;
  recommendedNextUpdate: string | null;

  /** Pass/fail verdict */
  verdict: RunStatusVerdict;
  verdictReason: string;
}

/** Derive a RunStatusData from normalizer report + metadata */
export function deriveRunStatus(opts: {
  clientId: string;
  clientName: string;
  runTimestamp: string | null;
  report: {
    campaignBrief: { confidenceScore: number | null; warnings: string[] };
    customerContext: { contextCoverage: number; sourceCount: number };
    orchestratorHints: {
      requiresResearch: boolean;
      requiresProductPositioning: boolean;
      requiresNarrativeSimulation: boolean;
      requiresPlatformEvaluation: boolean;
      missingCriticalInputs: string[];
    };
    learningHooks: {
      missingInputs: string[];
      compressionNotes: string[];
      recommendedNextUpdate: string | null;
    };
  } | null;
}): RunStatusData {
  const r = opts.report;
  if (!r) {
    return {
      clientId: opts.clientId,
      clientName: opts.clientName,
      runTimestamp: null,
      workflowVersion: "v2.1",
      status: "idle",
      contextCoverage: 0,
      confidenceScore: 0,
      missingInputsCount: 0,
      warningsCount: 0,
      sourceCount: 0,
      compressionNotesCount: 0,
      requiresResearch: false,
      requiresProductPositioning: false,
      requiresNarrativeSimulation: false,
      requiresPlatformEvaluation: false,
      recommendedNextUpdate: null,
      verdict: "blocked",
      verdictReason: "No analysis has been run yet",
    };
  }

  const confidence = r.campaignBrief.confidenceScore ?? 0;
  const missingCritical = r.orchestratorHints.missingCriticalInputs.length;
  const coverage = r.customerContext.contextCoverage;

  let verdict: RunStatusVerdict = "ready";
  let verdictReason = "All checks passed — ready for orchestration";

  if (missingCritical > 0) {
    verdict = "blocked";
    verdictReason = `Blocked by ${missingCritical} missing critical input${missingCritical > 1 ? "s" : ""}`;
  } else if (confidence < 40) {
    verdict = "low_confidence";
    verdictReason = `Confidence score (${confidence}%) is below the 40% threshold`;
  } else if (coverage < 30) {
    verdict = "needs_refresh";
    verdictReason = `Context coverage (${coverage}%) is too low — load more client data`;
  }

  return {
    clientId: opts.clientId,
    clientName: opts.clientName,
    runTimestamp: opts.runTimestamp,
    workflowVersion: "v2.1",
    status: "complete",
    contextCoverage: coverage,
    confidenceScore: confidence,
    missingInputsCount: r.orchestratorHints.missingCriticalInputs.length + r.learningHooks.missingInputs.length,
    warningsCount: r.campaignBrief.warnings.length,
    sourceCount: r.customerContext.sourceCount,
    compressionNotesCount: r.learningHooks.compressionNotes.length,
    requiresResearch: r.orchestratorHints.requiresResearch,
    requiresProductPositioning: r.orchestratorHints.requiresProductPositioning,
    requiresNarrativeSimulation: r.orchestratorHints.requiresNarrativeSimulation,
    requiresPlatformEvaluation: r.orchestratorHints.requiresPlatformEvaluation,
    recommendedNextUpdate: r.learningHooks.recommendedNextUpdate,
    verdict,
    verdictReason,
  };
}
