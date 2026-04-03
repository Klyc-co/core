/** 
 * KLYC Workflow Report Envelope
 * Single unified response shape from the run-campaign backend.
 */

export type RunStatusVerdict = "ready" | "blocked" | "low_confidence" | "needs_refresh";

// ── Run Metadata ──
export interface RunMetadata {
  clientId: string;
  clientName: string;
  runTimestamp: string;
  workflowVersion: string;
  status: "idle" | "running" | "complete" | "error";
  durationMs: number | null;
}

// ── Normalization Checksum ──
export interface NormalizationChecksum {
  contextCoverage: number;
  confidenceScore: number;
  missingInputsCount: number;
  warningsCount: number;
  sourceCount: number;
  compressionNotesCount: number;
}

// ── Orchestration Summary ──
export interface OrchestrationSummary {
  verdict: RunStatusVerdict;
  verdictReason: string;
  orchestrationStatus: "planned" | "executing" | "complete" | "blocked" | "partial";
  executionOrder: string[];
  partialRunAllowed: boolean;
  blockedReasons: string[];
  requiresResearch: boolean;
  requiresProductPositioning: boolean;
  requiresNarrativeSimulation: boolean;
  requiresPlatformEvaluation: boolean;
  estimatedComplexity: "low" | "medium" | "high";
}

// ── Submind Execution Summary ──
export interface SubmindStep {
  submind: string;
  status: "pending" | "running" | "complete" | "skipped" | "error";
  durationMs: number | null;
  confidenceScore: number | null;
  note: string | null;
}

export interface SubmindExecutionSummary {
  totalSubminds: number;
  completedSubminds: number;
  skippedSubminds: number;
  errorSubminds: number;
  steps: SubmindStep[];
}

// ── Backward-compatible aliases ──
export type AgentStep = SubmindStep;
export type AgentExecutionSummary = SubmindExecutionSummary;

// ── Next Actions ──
export interface NextActions {
  recommended: string[];
  optional: string[];
  recommendedNextUpdate: string | null;
}

// ── Raw Normalized Objects (from normalizer report) ──
export interface RawNormalizedObjects {
  campaignBrief?: import("@/types/normalizer-report").CampaignBrief;
  customerContext?: import("@/types/normalizer-report").CustomerContext;
  orchestratorHints?: import("@/types/normalizer-report").OrchestratorHints;
  learningHooks?: import("@/types/normalizer-report").LearningHooks;
}

// ── Full Envelope ──
export interface WorkflowReportEnvelope {
  runMetadata: RunMetadata;
  normalizationChecksum: NormalizationChecksum;
  orchestrationSummary: OrchestrationSummary;
  submindExecutionSummary: SubmindExecutionSummary;
  /** @deprecated Use submindExecutionSummary */
  agentExecutionSummary: SubmindExecutionSummary;
  nextActions: NextActions;
  rawNormalizedObjects?: RawNormalizedObjects;
}

/** Build an idle envelope for pre-run state */
export function idleEnvelope(clientId: string, clientName: string): WorkflowReportEnvelope {
  const summary: SubmindExecutionSummary = {
    totalSubminds: 0,
    completedSubminds: 0,
    skippedSubminds: 0,
    errorSubminds: 0,
    steps: [],
  };
  return {
    runMetadata: {
      clientId,
      clientName,
      runTimestamp: "",
      workflowVersion: "v2.1",
      status: "idle",
      durationMs: null,
    },
    normalizationChecksum: {
      contextCoverage: 0,
      confidenceScore: 0,
      missingInputsCount: 0,
      warningsCount: 0,
      sourceCount: 0,
      compressionNotesCount: 0,
    },
    orchestrationSummary: {
      verdict: "blocked",
      verdictReason: "No analysis has been run yet",
      orchestrationStatus: "planned",
      executionOrder: [],
      partialRunAllowed: false,
      blockedReasons: [],
      requiresResearch: false,
      requiresProductPositioning: false,
      requiresNarrativeSimulation: false,
      requiresPlatformEvaluation: false,
      estimatedComplexity: "low",
    },
    submindExecutionSummary: summary,
    agentExecutionSummary: summary,
    nextActions: {
      recommended: ["Run an analysis to begin"],
      optional: [],
      recommendedNextUpdate: null,
    },
  };
}
