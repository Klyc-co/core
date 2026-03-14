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

// ── Agent Execution Summary ──
export interface AgentStep {
  agent: string;
  status: "pending" | "running" | "complete" | "skipped" | "error";
  durationMs: number | null;
  note: string | null;
}

export interface AgentExecutionSummary {
  totalAgents: number;
  completedAgents: number;
  skippedAgents: number;
  errorAgents: number;
  steps: AgentStep[];
}

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
  agentExecutionSummary: AgentExecutionSummary;
  nextActions: NextActions;
  rawNormalizedObjects?: RawNormalizedObjects;
}

/** Build an idle envelope for pre-run state */
export function idleEnvelope(clientId: string, clientName: string): WorkflowReportEnvelope {
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
      blockedReasons: [],
      requiresResearch: false,
      requiresProductPositioning: false,
      requiresNarrativeSimulation: false,
      requiresPlatformEvaluation: false,
      estimatedComplexity: "low",
    },
    agentExecutionSummary: {
      totalAgents: 0,
      completedAgents: 0,
      skippedAgents: 0,
      errorAgents: 0,
      steps: [],
    },
    nextActions: {
      recommended: ["Run an analysis to begin"],
      optional: [],
      recommendedNextUpdate: null,
    },
  };
}
