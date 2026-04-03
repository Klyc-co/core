/**
 * KLYC Response Formatter
 * Compresses submind results into a unified campaign response.
 */

import type { SubmindOutput, SubmindStatus } from '../subminds/submind_interface'

type CompressedPayload = {
  research: Record<string, unknown>
  narrative: Record<string, unknown>
  social: Record<string, unknown>
  images: Record<string, unknown>
  product: Record<string, unknown>
  editor: Record<string, unknown>
  analytics: Record<string, unknown>
}

export type CampaignResponse = {
  campaign_id: string
  timestamp: number
  subminds_executed: string[]
  compressed_payload: CompressedPayload
  metadata: CampaignMetadata
  lifecycle?: any
}

type CampaignMetadata = {
  submind_count: number
  successful_subminds: number
  failed_subminds: number
  submind_statuses: Record<string, SubmindStatus>
  submind_errors: Record<string, string>
  [key: string]: unknown
}

const SUBMIND_KEY_MAP: Record<string, keyof CompressedPayload> = {
  research: 'research',
  narrative: 'narrative',
  social: 'social',
  image: 'images',
  product: 'product',
  editor: 'editor',
  analytics: 'analytics',
}

const normalizeData = (data: SubmindOutput['data']): Record<string, unknown> => {
  if (!data || typeof data !== 'object') return {}
  try {
    return JSON.parse(JSON.stringify(data)) as Record<string, unknown>
  } catch {
    return {}
  }
}

const normalizePayload = (submindResults: SubmindOutput[]): CompressedPayload => {
  const base: CompressedPayload = {
    research: {},
    narrative: {},
    social: {},
    images: {},
    product: {},
    editor: {},
    analytics: {},
  }

  for (const result of submindResults) {
    const key = SUBMIND_KEY_MAP[result.submind]
    if (!key) continue
    base[key] = normalizeData(result.data)
  }

  return base
}

export const generateCampaignId = (): string => {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID()
  }
  return `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const buildMetadata = (
  submindResults: SubmindOutput[],
  extras: Record<string, unknown> = {}
): CampaignMetadata => {
  const submind_statuses = submindResults.reduce<Record<string, SubmindStatus>>((acc, result) => {
    acc[result.submind] = result.status
    return acc
  }, {})

  const submind_errors = submindResults.reduce<Record<string, string>>((acc, result) => {
    if (result.status === 'error' && result.error) {
      acc[result.submind] = result.error
    }
    return acc
  }, {})

  const successful_subminds = submindResults.filter(r => r.status === 'success').length
  const failed_subminds = submindResults.length - successful_subminds

  return {
    submind_count: submindResults.length,
    successful_subminds,
    failed_subminds,
    submind_statuses,
    submind_errors,
    ...extras,
  }
}

export function formatCampaignResponse(
  submindResults: SubmindOutput[],
  options: {
    campaignId?: string
    metadata?: Record<string, unknown>
    lifecycle?: any
  } = {}
): CampaignResponse {
  const subminds_executed = [...new Set(submindResults.map(r => r.submind))]
  const compressed_payload = normalizePayload(submindResults)

  return {
    campaign_id: options.campaignId ?? generateCampaignId(),
    timestamp: Date.now(),
    subminds_executed,
    compressed_payload,
    metadata: buildMetadata(submindResults, options.metadata),
    lifecycle: options.lifecycle,
  }
}
