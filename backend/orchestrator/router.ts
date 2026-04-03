import type {
  CampaignBrief,
  CustomerDNA,
  LearningUpdate,
  OrchestratorHints
} from '../models/types'

type OrchestrationStatus = 'ready' | 'partial' | 'blocked'

const HIGH_COMPLEXITY_THRESHOLD = 5
const MEDIUM_COMPLEXITY_THRESHOLD = 3
const BLOCKING_MISSING_INPUTS_THRESHOLD = 2
const MAX_DISPLAYED_MISSING_INPUTS = 3

export type RoutingSignalKey =
  | 'requiresResearch'
  | 'requiresProductPositioning'
  | 'requiresNarrativeSimulation'
  | 'requiresPlatformEvaluation'

export interface RoutingInput {
  campaignBrief?: CampaignBrief
  customerContext?: CustomerDNA
  orchestratorHints?: OrchestratorHints
  learningHooks?: LearningUpdate[]
}

export interface RoutingSignals {
  requiresResearch: boolean
  requiresProductPositioning: boolean
  requiresNarrativeSimulation: boolean
  requiresPlatformEvaluation: boolean
  missingCriticalInputs: string[]
  estimatedCampaignComplexity: 'low' | 'medium' | 'high'
}

export interface OrchestrationPackage {
  executionOrder: RoutingSignalKey[]
  blockedReasons: string[]
  partialRunAllowed: boolean
  orchestrationStatus: OrchestrationStatus
  downstreamInputs: {
    campaignBrief?: CampaignBrief
    customerContext?: CustomerDNA
    learningHooks?: LearningUpdate[]
    requestedStrategy: string[]
    inferredSignals: RoutingSignals
  }
  nextReportHints: string[]
}

const extractMissingInputs = (hints?: OrchestratorHints) =>
  (hints?.missingInputs ?? []).filter(
    value => typeof value === 'string' && value.trim().length > 0
  )

const deduplicateNotes = (notes?: string[]) => Array.from(new Set(notes ?? []))

const evaluateComplexity = (input: RoutingInput): RoutingSignals['estimatedCampaignComplexity'] => {
  const { campaignBrief, customerContext } = input
  let score = 1

  const markets = campaignBrief?.focusMarkets?.length ?? 0
  const offers = campaignBrief?.primaryOffers?.length ?? 0
  const objections = customerContext?.objections?.length ?? 0
  const themes = customerContext?.semanticThemes?.length ?? 0
  const compressedNotes = deduplicateNotes([
    ...(campaignBrief?.compressedSummary?.metadata?.notes ?? []),
    ...(customerContext?.compressedSummary?.metadata?.notes ?? [])
  ])

  score += markets > 1 ? 1 : 0
  score += offers > 2 ? 1 : 0
  score += objections > 3 ? 1 : 0
  score += themes > 2 ? 1 : 0
  score += compressedNotes.length > 2 ? 1 : 0

  if (score >= HIGH_COMPLEXITY_THRESHOLD) return 'high'
  if (score >= MEDIUM_COMPLEXITY_THRESHOLD) return 'medium'
  return 'low'
}

const inferSignals = (input: RoutingInput): RoutingSignals => {
  const { campaignBrief, customerContext, orchestratorHints, learningHooks } = input
  const missingCriticalInputs = deduplicateNotes(extractMissingInputs(orchestratorHints))

  const requestedRouting = new Set(orchestratorHints?.routing ?? [])
  const hasStrategicLayer = Boolean(campaignBrief?.compressedSummary?.layers?.strategic)
  const hasExtractedLayer = Boolean(campaignBrief?.compressedSummary?.layers?.extracted)
  const hasCustomerThemes = Boolean(customerContext?.semanticThemes?.length)
  const hasProofPoints = Boolean(customerContext?.proofPoints?.length)
  const hasTrustSignals = Boolean(customerContext?.trustSignals?.length)
  const hasLearningSignals = Boolean(learningHooks?.length)
  const hasIncompleteStrategicLayer = !hasStrategicLayer && hasExtractedLayer

  const estimatedCampaignComplexity = evaluateComplexity(input)

  const requiresResearch =
    requestedRouting.has('research') ||
    missingCriticalInputs.some(value => /research|keywords|audience/i.test(value)) ||
    !hasCustomerThemes

  const requiresProductPositioning =
    requestedRouting.has('product') ||
    requestedRouting.has('positioning') ||
    missingCriticalInputs.some(value => /positioning|product/i.test(value)) ||
    !hasProofPoints ||
    !hasTrustSignals

  const requiresNarrativeSimulation =
    requestedRouting.has('narrative') ||
    requestedRouting.has('simulation') ||
    missingCriticalInputs.some(value => /story|narrative|angle/i.test(value)) ||
    hasIncompleteStrategicLayer ||
    (estimatedCampaignComplexity !== 'low' && hasLearningSignals)

  const requiresPlatformEvaluation =
    requestedRouting.has('platform') ||
    requestedRouting.has('evaluation') ||
    requestedRouting.has('social') ||
    missingCriticalInputs.some(value => /platform|channel|social/i.test(value)) ||
    (estimatedCampaignComplexity === 'high' && !campaignBrief?.callToActions?.length)

  return {
    requiresResearch,
    requiresProductPositioning,
    requiresNarrativeSimulation,
    requiresPlatformEvaluation,
    missingCriticalInputs,
    estimatedCampaignComplexity
  }
}

const buildExecutionOrder = (signals: RoutingSignals): RoutingSignalKey[] => {
  const order: RoutingSignalKey[] = []

  if (signals.requiresResearch) order.push('requiresResearch')
  if (signals.requiresProductPositioning) order.push('requiresProductPositioning')
  if (signals.requiresNarrativeSimulation) order.push('requiresNarrativeSimulation')
  if (signals.requiresPlatformEvaluation) order.push('requiresPlatformEvaluation')

  return order
}

const deriveStatus = (signals: RoutingSignals): OrchestrationStatus => {
  if (signals.missingCriticalInputs.length > BLOCKING_MISSING_INPUTS_THRESHOLD) return 'blocked'
  if (signals.missingCriticalInputs.length > 0) return 'partial'
  return 'ready'
}

const buildNextReportHints = (signals: RoutingSignals): string[] => {
  const hints: string[] = []

  if (signals.missingCriticalInputs.length) {
    hints.push(
      `Resolve missing inputs: ${signals.missingCriticalInputs
        .slice(0, MAX_DISPLAYED_MISSING_INPUTS)
        .join(', ')}`
    )
  }

  if (signals.estimatedCampaignComplexity === 'high') {
    hints.push('Expect staggered handoff due to campaign complexity')
  } else if (signals.estimatedCampaignComplexity === 'medium') {
    hints.push('Prioritize early research to unblock downstream subminds')
  }

  return hints
}

export function buildOrchestrationPackage(input: RoutingInput): OrchestrationPackage {
  const signals = inferSignals(input)
  const executionOrder = buildExecutionOrder(signals)
  const orchestrationStatus = deriveStatus(signals)
  const hasMissingInputs = signals.missingCriticalInputs.length > 0
  const partialRunAllowed = orchestrationStatus !== 'blocked'
  const blockedReasons = hasMissingInputs
    ? [`Missing critical inputs: ${signals.missingCriticalInputs.join(', ')}`]
    : []

  return {
    executionOrder,
    blockedReasons,
    partialRunAllowed,
    orchestrationStatus,
    downstreamInputs: {
      campaignBrief: input.campaignBrief,
      customerContext: input.customerContext,
      learningHooks: input.learningHooks,
      requestedStrategy: deduplicateNotes(input.orchestratorHints?.routing),
      inferredSignals: signals
    },
    nextReportHints: buildNextReportHints(signals)
  }
}
