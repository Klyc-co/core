import type { CompressedContext, Platform } from '../models/types'

type HuntingMode = 'reactive' | 'proactive'

const DEFAULT_TIME_WINDOW_MINUTES = 60
const STAY_ALIGNMENT_THRESHOLD = 0.75
const ADJUST_ALIGNMENT_THRESHOLD = 0.45
const MAX_CADENCE_DELTA_FOR_STAY = 1
const KEYWORD_MISS_PENALTY = 0.5
const AMPLIFY_VIRALITY_THRESHOLD = 75
const AMPLIFY_ACCELERATION_THRESHOLD = 0.5
const MONITOR_VIRALITY_THRESHOLD = 40

export interface OpportunitySignal {
  platform: Platform
  mentions: number
  engagement: number
  uniqueCommunities?: number
  crossLinks?: number
  topic?: string
  topicRelevance?: number
  buyerPresence?: number
  timeWindowMinutes?: number
  sentimentIntensity?: number
  arousal?: number
  trending?: boolean
}

export interface OpportunityProfile {
  prevalence: number
  diversity: number
  connectivity: number
  signalBlendScore: number
  huntingMode: HuntingMode
  recommendedPlatforms: RankedPlatform[]
  compressed: {
    sbs: number
    mode: HuntingMode
    top_platforms: Platform[]
  }
}

export interface RequestedStrategy {
  platforms: Platform[]
  cadencePerWeek?: number
  keywords?: string[]
  mode?: HuntingMode
}

export interface RecommendedStrategy {
  rankedPlatforms: RankedPlatform[]
  cadencePerWeek: number
  focusKeywords?: string[]
  mode: HuntingMode
}

export interface StrategyComparison {
  alignmentScore: number
  platformGaps: {
    missingInRequest: Platform[]
    missingInRecommendation: Platform[]
  }
  cadenceDelta: number
  keywordDelta: {
    overlap: string[]
    missing: string[]
    additions: string[]
  }
  decision: 'stay' | 'adjust' | 'override'
}

export interface PlatformPerformanceInput {
  platform: Platform
  audienceDensity: number
  engagementRate: number
  topicRelevance: number
  buyerPresence: number
}

interface PlatformPerformanceAccumulator extends PlatformPerformanceInput {
  count: number
}

export interface RankedPlatform {
  platform: Platform
  performanceScore: number
  normalizedScore: number
}

export interface PreLaunchComponents {
  R: number // Relevance
  N: number // Novelty
  EE: number // Emotional Energy
  PF: number // Platform Fit
  CC: number // Channel Consistency
  U: number // Urgency
}

export interface PreLaunchWeights {
  w_r?: number
  w_n?: number
  w_e?: number
  w_p?: number
  w_c?: number
  w_u?: number
}

export interface NarrativeCandidateInput {
  id: string
  contentVector: number[]
  clarity: number
  trust: number
  relevance: number
  platformFit: number
  channelConsistency?: number
  urgency?: number
  arousal?: number
  sentimentIntensity?: number
  metadata?: Record<string, unknown>
}

export interface NarrativeCandidateScore {
  id: string
  novelty: number
  emotionalEnergy: number
  preLaunchScore: number
  narrativeRank: number
  clarity: number
  trust: number
  metadata?: Record<string, unknown>
}

export interface ViralityCheckpointInput {
  elapsedSeconds: number
  engagement: number
  engagementRate?: number
  diversity?: number
  novelty?: number
  uniqueCommunities?: number
  totalEngagement?: number
  arousal?: number
  sentimentIntensity?: number
  previousVelocity?: number
}

export interface ViralityCheckpointResult {
  velocity: number
  acceleration: number
  communityShare: number
  emotionalEnergy: number
  viralityScore: number
  decision: 'amplify' | 'monitor' | 'archive'
  components: {
    engagement: number
    velocity: number
    novelty: number
    diversity: number
    communityShare: number
    emotionalEnergy: number
  }
}

export interface LearningDeltaInput {
  previous: ViralityCheckpointResult | null
  current: ViralityCheckpointResult
  preLaunchScore?: number
  narrativeRank?: number
}

export interface LearningDelta {
  viralityDelta: number
  velocityDelta: number
  narrativeDelta?: number
  recommendation: string
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max)

const safeNumber = (value: number | undefined, fallback = 0) =>
  Number.isFinite(value) ? (value as number) : fallback

const dropEmpty = <T extends Record<string, unknown>>(value: T): T =>
  Object.entries(value).reduce<T>((acc, [key, val]) => {
    if (
      val === undefined ||
      val === null ||
      (typeof val === 'number' && Number.isNaN(val))
    ) {
      return acc
    }
    acc[key as keyof T] = val as T[keyof T]
    return acc
  }, {} as T)

const toUnitInterval = (value: number) => {
  const safe = Math.max(0, safeNumber(value, 0))
  return safe / (safe + 1)
}

const cosineSimilarity = (a: number[], b: number[]) => {
  if (!a.length || !b.length || a.length !== b.length) return 0
  const dot = a.reduce((sum, val, idx) => sum + val * b[idx], 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  if (!magA || !magB) return 0
  return dot / (magA * magB)
}

const averageVector = (vectors: number[][]): number[] => {
  if (!vectors.length) return []
  const length = vectors[0].length
  const sums = new Array(length).fill(0)
  vectors.forEach(vector => {
    vector.forEach((value, index) => {
      sums[index] += value
    })
  })
  return sums.map(value => value / vectors.length)
}

const normalizeWeights = (weights: PreLaunchWeights) => {
  const defaults = { w_r: 0.25, w_n: 0.2, w_e: 0.15, w_p: 0.15, w_c: 0.15, w_u: 0.1 }
  const merged = { ...defaults, ...weights }
  const total =
    merged.w_r + merged.w_n + merged.w_e + merged.w_p + merged.w_c + merged.w_u
  if (!total) return defaults
  return {
    w_r: merged.w_r / total,
    w_n: merged.w_n / total,
    w_e: merged.w_e / total,
    w_p: merged.w_p / total,
    w_c: merged.w_c / total,
    w_u: merged.w_u / total
  }
}

const determineHuntingMode = (
  signals: OpportunitySignal[],
  explicit?: HuntingMode
): HuntingMode => {
  if (explicit) return explicit
  const reactive = signals.some(
    signal =>
      signal.trending ||
      safeNumber(
        signal.engagement / (signal.timeWindowMinutes || DEFAULT_TIME_WINDOW_MINUTES),
        0
      ) > 1
  )
  return reactive ? 'reactive' : 'proactive'
}

export function buildOpportunityProfile(
  signals: OpportunitySignal[],
  options: { context?: CompressedContext; mode?: HuntingMode } = {}
): OpportunityProfile {
  const totalMentions = signals.reduce((sum, signal) => sum + safeNumber(signal.mentions, 0), 0)
  const uniqueTopics = new Set(
    signals.map(signal => signal.topic).filter(Boolean) as string[]
  ).size
  const uniquePlatforms = new Set(signals.map(signal => signal.platform)).size
  const prevalence = totalMentions
  const diversity =
    uniqueTopics > 0
      ? uniqueTopics / signals.length
      : uniquePlatforms / Math.max(signals.length, 1)
  const connectivity =
    signals.reduce((sum, signal) => sum + safeNumber(signal.crossLinks, 0), 0) /
    Math.max(signals.length, 1)
  const signalBlendScore = prevalence + diversity + connectivity

  const mode = determineHuntingMode(signals, options.mode)

  const platformPerformance: PlatformPerformanceInput[] = Array.from(
    signals.reduce((acc: Map<Platform, PlatformPerformanceAccumulator>, signal) => {
      const current =
        acc.get(signal.platform) || {
          platform: signal.platform,
          audienceDensity: 0,
          engagementRate: 0,
          topicRelevance: 0,
          buyerPresence: 0,
          count: 0
        }
      current.audienceDensity += toUnitInterval(signal.mentions)
      current.engagementRate += toUnitInterval(signal.engagement)
      current.topicRelevance += toUnitInterval(signal.topicRelevance ?? 0.5)
      current.buyerPresence += toUnitInterval(signal.buyerPresence ?? 0.5)
      current.count += 1
      acc.set(signal.platform, current)
      return acc
    }, new Map<Platform, PlatformPerformanceAccumulator>())
  ).map(({ count, ...rest }) => ({
    platform: rest.platform,
    audienceDensity: rest.audienceDensity / count,
    engagementRate: rest.engagementRate / count,
    topicRelevance: rest.topicRelevance / count,
    buyerPresence: rest.buyerPresence / count
  }))

  const rankedPlatforms = rankPlatforms(platformPerformance, mode)

  return {
    prevalence,
    diversity,
    connectivity,
    signalBlendScore,
    huntingMode: mode,
    recommendedPlatforms: rankedPlatforms,
    compressed: {
      sbs: Number(signalBlendScore.toFixed(3)),
      mode,
      top_platforms: rankedPlatforms.slice(0, 3).map(item => item.platform)
    }
  }
}

export function compareRequestedVsRecommendedStrategy(
  requested: RequestedStrategy,
  recommended: RecommendedStrategy
): StrategyComparison {
  const requestedPlatforms = new Set(requested.platforms)
  const recommendedPlatforms = new Set(recommended.rankedPlatforms.map(p => p.platform))

  const platformOverlap =
    requested.platforms.filter(platform => recommendedPlatforms.has(platform)).length /
    Math.max(requested.platforms.length, 1)

  const missingInRequest = Array.from(recommendedPlatforms).filter(
    platform => !requestedPlatforms.has(platform)
  ) as Platform[]
  const missingInRecommendation = requested.platforms.filter(
    platform => !recommendedPlatforms.has(platform)
  )

  const cadenceDelta =
    safeNumber(recommended.cadencePerWeek, 0) - safeNumber(requested.cadencePerWeek, 0)
  const cadenceDeltaMagnitude = Math.abs(cadenceDelta)

  const requestedKeywords = new Set((requested.keywords || []).map(k => k.toLowerCase()))
  const recommendedKeywords = new Set((recommended.focusKeywords || []).map(k => k.toLowerCase()))

  const keywordOverlap = Array.from(requestedKeywords).filter(k => recommendedKeywords.has(k))
  const keywordMissing = Array.from(requestedKeywords).filter(k => !recommendedKeywords.has(k))
  const keywordAdditions = Array.from(recommendedKeywords).filter(k => !requestedKeywords.has(k))

  const keywordPenalty =
    (keywordMissing.length + keywordAdditions.length) * KEYWORD_MISS_PENALTY
  const keywordAlignment = clamp(
    (keywordOverlap.length - keywordPenalty) / Math.max(requestedKeywords.size, 1),
    0,
    1
  )

  const alignmentScore = clamp((platformOverlap + keywordAlignment) / 2, 0, 1)

  const decision: StrategyComparison['decision'] =
    alignmentScore > STAY_ALIGNMENT_THRESHOLD &&
    cadenceDeltaMagnitude <= MAX_CADENCE_DELTA_FOR_STAY
      ? 'stay'
      : alignmentScore > ADJUST_ALIGNMENT_THRESHOLD
        ? 'adjust'
        : 'override'

  return {
    alignmentScore,
    platformGaps: {
      missingInRequest,
      missingInRecommendation
    },
    cadenceDelta,
    keywordDelta: {
      overlap: keywordOverlap,
      missing: keywordMissing,
      additions: keywordAdditions
    },
    decision
  }
}

export function rankPlatforms(
  platforms: PlatformPerformanceInput[],
  mode: HuntingMode = 'proactive'
): RankedPlatform[] {
  if (!platforms.length) return []

  const scored = platforms.map(entry => {
    const { platform, audienceDensity, engagementRate, topicRelevance, buyerPresence } = entry
    const baseScore =
      clamp(audienceDensity) *
      clamp(engagementRate) *
      clamp(topicRelevance) *
      clamp(buyerPresence)

    const performanceScore =
      baseScore * (mode === 'reactive' ? clamp(engagementRate * 1.1) : 1)
    return { platform, performanceScore }
  })

  const maxScore = Math.max(...scored.map(item => item.performanceScore), 1)

  return scored
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .map(item => ({
      platform: item.platform,
      performanceScore: item.performanceScore,
      normalizedScore: item.performanceScore / maxScore
    }))
}

export function computePreLaunchScore(
  components: PreLaunchComponents,
  weights: PreLaunchWeights = {}
): number {
  const normalizedWeights = normalizeWeights(weights)
  const score =
    normalizedWeights.w_r * clamp(components.R) +
    normalizedWeights.w_n * clamp(components.N) +
    normalizedWeights.w_e * clamp(components.EE) +
    normalizedWeights.w_p * clamp(components.PF) +
    normalizedWeights.w_c * clamp(components.CC) +
    normalizedWeights.w_u * clamp(components.U)

  return Number(score.toFixed(4))
}

export function computeNarrativeRank(
  preLaunchScore: number,
  clarity: number,
  trust: number
): number {
  const rank = preLaunchScore * clamp(clarity) * clamp(trust)
  return Number(rank.toFixed(4))
}

export function scoreNarrativeCandidates(
  candidates: NarrativeCandidateInput[],
  historyVectors: number[][] = [],
  weights: PreLaunchWeights = {}
): NarrativeCandidateScore[] {
  const reference = averageVector(historyVectors)

  return candidates
    .map(candidate => {
      const novelty = 1 - cosineSimilarity(candidate.contentVector, reference)
      const emotionalEnergy =
        safeNumber(candidate.arousal, 0.5) * safeNumber(candidate.sentimentIntensity, 0.5)

      const preLaunchScore = computePreLaunchScore(
        {
          R: clamp(candidate.relevance),
          N: clamp(novelty),
          EE: clamp(emotionalEnergy),
          PF: clamp(candidate.platformFit),
          CC: clamp(candidate.channelConsistency ?? 0.7),
          U: clamp(candidate.urgency ?? 0.5)
        },
        weights
      )

      const narrativeRank = computeNarrativeRank(
        preLaunchScore,
        clamp(candidate.clarity),
        clamp(candidate.trust)
      )

      return dropEmpty<NarrativeCandidateScore>({
        id: candidate.id,
        novelty: Number(novelty.toFixed(4)),
        emotionalEnergy: Number(emotionalEnergy.toFixed(4)),
        preLaunchScore,
        narrativeRank,
        clarity: clamp(candidate.clarity),
        trust: clamp(candidate.trust),
        metadata: candidate.metadata
      })
    })
    .sort((a, b) => b.narrativeRank - a.narrativeRank)
}

export function computeViralityCheckpoint(
  input: ViralityCheckpointInput
): ViralityCheckpointResult {
  const engagementScore = clamp(safeNumber(input.engagementRate, input.engagement), 0, 100)
  const velocity = input.elapsedSeconds > 0 ? input.engagement / input.elapsedSeconds : 0
  const acceleration = velocity - safeNumber(input.previousVelocity, 0)

  const noveltyScore = clamp(safeNumber(input.novelty, 0.5), 0, 1)
  const diversityScore = clamp(safeNumber(input.diversity, 0.5), 0, 1)
  const communityShare = clamp(
    safeNumber(input.uniqueCommunities, 0) / Math.max(safeNumber(input.totalEngagement, 1), 1),
    0,
    1
  )
  const emotionalEnergy =
    safeNumber(input.arousal, 0.5) * safeNumber(input.sentimentIntensity, 0.5)

  const viralityScore =
    0.25 * engagementScore +
    0.25 * velocity +
    0.2 * (noveltyScore * 100) +
    0.15 * (diversityScore * 100) +
    0.1 * (communityShare * 100) +
    0.05 * (emotionalEnergy * 100)

  const decision: ViralityCheckpointResult['decision'] =
    viralityScore >= AMPLIFY_VIRALITY_THRESHOLD ||
    acceleration > AMPLIFY_ACCELERATION_THRESHOLD
      ? 'amplify'
      : viralityScore >= MONITOR_VIRALITY_THRESHOLD
        ? 'monitor'
        : 'archive'

  return {
    velocity,
    acceleration,
    communityShare,
    emotionalEnergy,
    viralityScore: Number(viralityScore.toFixed(2)),
    decision,
    components: {
      engagement: Number(engagementScore.toFixed(2)),
      velocity: Number(velocity.toFixed(4)),
      novelty: Number((noveltyScore * 100).toFixed(2)),
      diversity: Number((diversityScore * 100).toFixed(2)),
      communityShare: Number((communityShare * 100).toFixed(2)),
      emotionalEnergy: Number((emotionalEnergy * 100).toFixed(2))
    }
  }
}

export function generateLearningDelta(
  input: LearningDeltaInput
): LearningDelta {
  const previousVirality = input.previous?.viralityScore ?? 0
  const viralityDelta = input.current.viralityScore - previousVirality
  const velocityDelta = input.current.velocity - (input.previous?.velocity ?? 0)

  const narrativeDelta =
    typeof input.narrativeRank === 'number' && typeof input.preLaunchScore === 'number'
      ? input.narrativeRank - input.preLaunchScore
      : undefined

  const recommendation =
    viralityDelta > 0
      ? 'Maintain amplification patterns and refresh hooks with top-ranked narratives.'
      : velocityDelta > 0
        ? 'Momentum is building; schedule proactive boosts on the top ranked platforms.'
        : 'Archive underperforming threads and pivot to higher novelty and clarity variants.'

  return dropEmpty({
    viralityDelta: Number(viralityDelta.toFixed(2)),
    velocityDelta: Number(velocityDelta.toFixed(4)),
    narrativeDelta: narrativeDelta !== undefined ? Number(narrativeDelta.toFixed(4)) : undefined,
    recommendation
  })
}
