import { z } from 'zod'
import type {
  CampaignBrief,
  CustomerDNA,
  LearningUpdate,
  NormalizerAdapterResult,
  OrchestratorHints,
  SourceReference,
  WorkflowRequestType
} from '../models/types'

const MAX_STRING_LENGTH = 800

const clampString = (value: string) => value.trim().slice(0, MAX_STRING_LENGTH)
const sanitizeStringArray = (values?: string[]) => {
  if (!values) return undefined
  const normalized = values
    .map(value => clampString(value))
    .filter(Boolean)
  if (!normalized.length) return undefined
  return Array.from(new Set(normalized))
}

const sourceReferenceSchema = z
  .object({
    id: z.string().transform(clampString),
    type: z.enum(['url', 'document', 'transcript', 'note', 'asset']),
    uri: z.string().transform(clampString).optional(),
    title: z.string().transform(clampString).optional(),
    checksum: z.string().transform(clampString).optional(),
    snippetHash: z.string().transform(clampString).optional(),
    contextHint: z.string().transform(clampString).optional()
  })
  .strip()

const summaryLayerSchema = z
  .object({
    hash: z.string(),
    length: z.number(),
    preview: z.string().optional(),
    sourceIds: z.array(z.string()).optional()
  })
  .strip()

const compressionMetadataSchema = z
  .object({
    schemaVersion: z.string().default('1.0.0'),
    createdAt: z.number().optional(),
    method: z.string().optional(),
    sourceReferences: z.array(sourceReferenceSchema).optional(),
    sharedMemoryKeys: z.array(z.string()).optional(),
    derivedFrom: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional()
  })
  .strip()

const compressedSummarySchema = z
  .object({
    layers: z
      .object({
        raw: summaryLayerSchema.optional(),
        extracted: summaryLayerSchema.optional(),
        strategic: summaryLayerSchema.optional()
      })
      .partial()
      .strip(),
    metadata: compressionMetadataSchema
  })
  .strip()

const campaignBriefSchema = z
  .object({
    version: z.string().default('1.0.0'),
    campaignId: z.string().transform(clampString),
    title: z.string().transform(clampString),
    objective: z.string().transform(clampString),
    focusMarkets: z.array(z.string()).optional(),
    timeHorizonDays: z.number().optional(),
    primaryOffers: z.array(z.string()).optional(),
    callToActions: z.array(z.string()).optional(),
    guardrails: z.array(z.string()).optional(),
    compressedSummary: compressedSummarySchema,
    sourceReferences: z.array(sourceReferenceSchema).optional(),
    sharedMemoryKeys: z.array(z.string()).optional()
  })
  .strip()

const customerContextSchema = z
  .object({
    version: z.string().default('1.0.0'),
    brandVoice: z.string().transform(clampString),
    offerMap: z.array(z.string()).optional(),
    audienceSegments: z.array(z.string()).optional(),
    buyerPainPoints: z.array(z.string()).optional(),
    proofPoints: z.array(z.string()).optional(),
    competitors: z.array(z.string()).optional(),
    regulations: z.array(z.string()).optional(),
    semanticThemes: z.array(z.string()).optional(),
    trustSignals: z.array(z.string()).optional(),
    objections: z.array(z.string()).optional(),
    sourceReferences: z.array(sourceReferenceSchema).optional(),
    compressedSummary: compressedSummarySchema
  })
  .strip()

const learningUpdateSchema = z
  .object({
    version: z.string().default('1.0.0'),
    campaignId: z.string().transform(clampString),
    appliedToVersion: z.string().optional(),
    scope: z.enum(['customer_dna', 'strategy', 'narrative', 'performance']),
    delta: z
      .object({
        added: z.array(z.string()).optional(),
        updated: z.array(z.string()).optional(),
        removed: z.array(z.string()).optional()
      })
      .strip(),
    sourceReferences: z.array(sourceReferenceSchema).optional(),
    compressedSummary: compressedSummarySchema
  })
  .strip()

const orchestratorHintsSchema = z
  .object({
    missingInputs: z.array(z.string()).optional(),
    compressionNotes: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    sourceReferences: z.array(sourceReferenceSchema).optional(),
    routing: z.array(z.string()).optional(),
    guardrails: z.array(z.string()).optional(),
    directives: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .strip()

const responseMetaSchema = z
  .object({
    missingInputs: z.array(z.string()).optional(),
    compressionNotes: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    sourceReferences: z.array(sourceReferenceSchema).optional()
  })
  .strip()

const normalizerResponseSchema = z
  .object({
    campaignBrief: campaignBriefSchema.optional(),
    customerContext: customerContextSchema.optional(),
    orchestratorHints: orchestratorHintsSchema.optional(),
    learningHooks: z.array(learningUpdateSchema).optional(),
    meta: responseMetaSchema.optional()
  })
  .strip()

type NormalizerResponse = z.infer<typeof normalizerResponseSchema>

export interface NormalizerAdapterOptions {
  requestId?: string
  workflowRunId?: string
  requestType?: WorkflowRequestType
  clientId?: string
}

const unwrapPayload = (raw: unknown): unknown => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  if (raw && typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>
    if (candidate.response && typeof candidate.response === 'object') {
      return candidate.response
    }
    if (candidate.data && typeof candidate.data === 'object') {
      return candidate.data
    }
    return candidate
  }

  return {}
}

const mergeStringArrays = (...values: Array<string[] | undefined>) =>
  sanitizeStringArray(values.flatMap(value => value || []))

const pickSourceReferences = (
  ...refs: Array<SourceReference[] | undefined>
): SourceReference[] | undefined => {
  for (const entry of refs) {
    if (entry?.length) return entry
  }
  return undefined
}

export function adaptNormalizerResponse(
  raw: unknown,
  options: NormalizerAdapterOptions = {}
): NormalizerAdapterResult {
  const payload = unwrapPayload(raw)
  const parsed = normalizerResponseSchema.safeParse(payload)

  if (!parsed.success) {
    return {
      meta: {
        requestId: options.requestId,
        workflowRunId: options.workflowRunId,
        requestType: options.requestType,
        clientId: options.clientId,
        receivedAt: Date.now()
      }
    }
  }

  const data: NormalizerResponse = parsed.data
  const missingInputs = mergeStringArrays(
    data.meta?.missingInputs,
    data.orchestratorHints?.missingInputs
  )
  const compressionNotes = mergeStringArrays(
    data.meta?.compressionNotes,
    data.orchestratorHints?.compressionNotes,
    data.campaignBrief?.compressedSummary.metadata.notes,
    data.customerContext?.compressedSummary.metadata.notes
  )
  const confidence = data.meta?.confidence ?? data.orchestratorHints?.confidence
  const sourceReferences = pickSourceReferences(
    data.meta?.sourceReferences,
    data.orchestratorHints?.sourceReferences,
    data.campaignBrief?.sourceReferences,
    data.customerContext?.sourceReferences
  )

  const normalizedHints: OrchestratorHints | undefined = data.orchestratorHints
    ? {
        ...data.orchestratorHints,
        missingInputs,
        compressionNotes,
        confidence,
        sourceReferences
      }
    : undefined

  return {
    campaignBrief: data.campaignBrief,
    customerContext: data.customerContext,
    orchestratorHints: normalizedHints,
    learningHooks: data.learningHooks,
    meta: {
      requestId: options.requestId,
      workflowRunId: options.workflowRunId,
      requestType: options.requestType,
      clientId: options.clientId,
      receivedAt: Date.now(),
      confidence,
      missingInputs,
      compressionNotes,
      sourceReferences
    }
  }
}
