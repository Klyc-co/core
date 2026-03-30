import { createHash } from 'crypto'
import type {
  CampaignAdapterRequest,
  CompressedContext,
  ContentAdapterRequest,
  CompressedSummary,
  SchemaVersion,
  SourceReference,
  SummaryLayerHash,
  SummaryLayers
} from '../models/types'

const MAX_FIELD_LENGTH = 400
const HASH_ALGORITHM = 'sha256'
const PREVIEW_LENGTH = 120
const DEFAULT_SCHEMA_VERSION: SchemaVersion = '1.0.0'

const trimField = (value?: string) =>
  value ? value.trim().slice(0, MAX_FIELD_LENGTH) : undefined

const uniqueKeywords = (keywords?: string[]) =>
  Array.from(
    new Set(
      (keywords || [])
        .map(keyword => keyword?.trim())
        .filter(Boolean)
        .map(keyword => keyword as string)
    )
  ).slice(0, 25)

const dropEmpty = (context: Record<string, unknown>): Record<string, unknown> =>
  Object.entries(context).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return acc
    }
    acc[key] = value
    return acc
  }, {})

const hashContent = (value: string, sourceIds?: string[]): SummaryLayerHash => {
  const normalized = value.trim()
  return {
    hash: createHash(HASH_ALGORITHM).update(normalized).digest('hex'),
    length: normalized.length,
    preview: normalized.slice(0, PREVIEW_LENGTH),
    sourceIds
  }
}

const deriveReferenceIds = (references?: SourceReference[]) => {
  if (!references?.length) return undefined
  const ids = references
    .map(ref => ref.id?.trim())
    .filter((value): value is string => Boolean(value))
  return ids.length ? ids : undefined
}

const buildLabeledBlock = (entries: Array<[string, string | undefined]>) =>
  entries
    .map(([label, value]) => (value ? `${label}: ${value}` : undefined))
    .filter(Boolean)
    .join('\n')

const buildKeywordSummary = (keywords?: string[]) => {
  const normalized = uniqueKeywords(keywords)
    .map(keyword => `keyword:${keyword}`)
    .join(', ')
  return normalized || undefined
}

const buildLayers = (layerData: {
  raw?: string
  extracted?: string
  strategic?: string
  sourceReferences?: SourceReference[]
  sharedMemoryKeys?: string[]
  derivedFrom?: string[]
}): CompressedSummary => {
  const summaries: SummaryLayers = {}
  const sourceIds = deriveReferenceIds(layerData.sourceReferences)

  const addHashedLayerIfPresent = (key: keyof SummaryLayers, value?: string) => {
    const normalized = value?.trim()
    if (!normalized) return
    summaries[key] = hashContent(normalized, sourceIds)
  }

  addHashedLayerIfPresent('raw', layerData.raw)
  addHashedLayerIfPresent('extracted', layerData.extracted)
  addHashedLayerIfPresent('strategic', layerData.strategic)

  return {
    layers: summaries,
    metadata: {
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      createdAt: Date.now(),
      method: HASH_ALGORITHM,
      sourceReferences: layerData.sourceReferences,
      sharedMemoryKeys: layerData.sharedMemoryKeys,
      derivedFrom: layerData.derivedFrom
    }
  }
}

export function compressSummaryLayers(input: {
  raw?: string
  extracted?: string
  strategic?: string
  sourceReferences?: SourceReference[]
  sharedMemoryKeys?: string[]
  derivedFrom?: string[]
}): CompressedSummary {
  return buildLayers(input)
}

export function compressCampaignContext(
  request: CampaignAdapterRequest
): CompressedContext {
  const summary = buildLayers({
    raw: buildLabeledBlock([
      ['brandVoice', request.brandVoice],
      ['audience', request.audience],
      ['positioning', request.productPositioning],
      ['history', request.campaignHistorySummary],
      ['campaign', request.campaignName]
    ]),
    extracted: buildKeywordSummary(request.keywords)
  })

  const compressed: CompressedContext = {
    brand_voice: trimField(request.brandVoice),
    audience: trimField(request.audience),
    product_positioning: trimField(request.productPositioning),
    campaign_history_summary: trimField(request.campaignHistorySummary),
    campaign_name: trimField(request.campaignName),
    keywords: uniqueKeywords(request.keywords),
    schema_version: DEFAULT_SCHEMA_VERSION,
    summary_layers: summary.layers,
    compression: summary.metadata,
    reference_ids: deriveReferenceIds(summary.metadata.sourceReferences),
    shared_memory_keys: summary.metadata.sharedMemoryKeys
  }

  return dropEmpty(compressed)
}

export function compressContentContext(
  request: ContentAdapterRequest
): CompressedContext {
  const summary = buildLayers({
    raw: buildLabeledBlock([
      ['brandVoice', request.brandVoice],
      ['audience', request.audience],
      ['brief', request.brief]
    ]),
    extracted: buildKeywordSummary(request.keywords),
    derivedFrom: request.campaignId ? [request.campaignId] : undefined
  })

  const compressed: CompressedContext = {
    brand_voice: trimField(request.brandVoice),
    audience: trimField(request.audience),
    content_brief: trimField(request.brief),
    keywords: uniqueKeywords(request.keywords),
    schema_version: DEFAULT_SCHEMA_VERSION,
    summary_layers: summary.layers,
    compression: summary.metadata,
    reference_ids: deriveReferenceIds(summary.metadata.sourceReferences),
    shared_memory_keys: summary.metadata.sharedMemoryKeys
  }

  return dropEmpty(compressed)
}
