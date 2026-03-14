/** Normalizer Report types – mirrors the workflow output shape */

export interface CampaignBrief {
  geoFilter: string | null;
  industryFilter: string | null;
  customerSizeFilter: string | null;
  competitorFilter: string | null;
  addressableMarket: string | null;
  businessNeed: string | null;
  regulatoryDriver: string | null;
  productDefinition: string | null;
  campaignGoal: string | null;
  requestedPlatforms: string[];
  recommendedPlatformsHint: string[];
  campaignMode: string | null;
  confidenceScore: number | null;
  warnings: string[];
}

export interface CustomerContext {
  brandVoiceSummary: string | null;
  productOfferSummary: string | null;
  audienceSegments: string[];
  primaryPainPoints: string[];
  proofPoints: string[];
  competitors: string[];
  regulations: string[];
  semanticThemes: string[];
  trustSignals: string[];
  objections: string[];
  sourceCount: number;
  lastUpdated: string | null;
  contextCoverage: number; // 0–100
}

export interface OrchestratorHints {
  requiresResearch: boolean;
  requiresProductPositioning: boolean;
  requiresNarrativeSimulation: boolean;
  requiresPlatformEvaluation: boolean;
  estimatedCampaignComplexity: "low" | "medium" | "high";
  missingCriticalInputs: string[];
}

export interface LearningHooks {
  explicitInputs: string[];
  inferredSignals: string[];
  missingInputs: string[];
  confidenceDrivers: string[];
  compressionNotes: string[];
  updatableFields: string[];
  sourceReferences: string[];
  recommendedNextUpdate: string | null;
}

export interface NormalizerReport {
  campaignBrief: CampaignBrief;
  customerContext: CustomerContext;
  orchestratorHints: OrchestratorHints;
  learningHooks: LearningHooks;
}
