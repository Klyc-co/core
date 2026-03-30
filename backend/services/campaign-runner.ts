/**
 * KLYC Campaign Runner
 * End-to-end campaign execution: validate → normalize → orchestrate.
 * Migrated from ai-controller/backend/services/campaign-runner.ts
 */

import { z } from 'zod'
import { NormalizerAgent } from '../agents/normalizer'
import type {
  NormalizationReportEnvelope,
  OrchestrationContext,
  ValidationErrorPayload,
} from '../models/types'
import { Security } from './security'

export type CampaignRunOrchestrator = {
  runCampaign: (body: any) => Promise<{
    success: boolean
    data?: unknown
    error?: string
  }>
}

type NormalizationMetadataRecord = {
  run_id: string
  client_id: string
  client_name?: string
  workflow_version: string
  run_timestamp: string
  normalization_status: string
}

const MAX_STORED_RUNS = 50

const baseWorkflowPayload = z
  .object({
    input_as_text: z.string().trim().min(1, 'input_as_text is required'),
    client_id: z.string().trim().min(1, 'client_id is required'),
    client_name: z.string().trim().min(1, 'client_name is required'),
    goal: z.string().trim().optional(),
    platforms: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    contentTypes: z.array(z.string()).optional(),
    compressed_customer_dna: z.string().optional(),
    prior_strategy_summary: z.string().optional(),
    prior_campaign_summary: z.string().optional(),
    website_summary: z.string().optional(),
    product_summary: z.string().optional(),
    regulatory_summary: z.string().optional(),
    competitor_summary: z.string().optional(),
    compressed_context: z.record(z.any()).optional(),
    payload: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  })
  .passthrough()

const workflowPayloadSchema = baseWorkflowPayload.or(
  z.object({ payload: baseWorkflowPayload })
)

class CampaignRunStore {
  private runs: NormalizationMetadataRecord[] = []

  add(record: NormalizationMetadataRecord) {
    this.runs.unshift(record)
    if (this.runs.length > MAX_STORED_RUNS) {
      this.runs = this.runs.slice(0, MAX_STORED_RUNS)
    }
  }

  latest(): NormalizationMetadataRecord | undefined {
    return this.runs[0]
  }
}

export const campaignRunStore = new CampaignRunStore()

type FlattenedWorkflowPayload = z.infer<typeof workflowPayloadSchema> & {
  payload?: Record<string, unknown>
}

function mergePayload(payload: FlattenedWorkflowPayload) {
  const root = payload as Record<string, unknown>
  const nested =
    'payload' in root && typeof root.payload === 'object' && root.payload !== null
      ? (root.payload as Record<string, unknown>)
      : {}

  const readString = (key: string): string | undefined => {
    const value = root[key] ?? nested[key]
    return typeof value === 'string' ? value : undefined
  }

  const readStringArray = (key: string): string[] | undefined => {
    const value = root[key] ?? nested[key]
    return Array.isArray(value) ? (value as string[]) : undefined
  }

  const primaryContentTypes = readStringArray('contentTypes')
  const contentTypes =
    (primaryContentTypes?.length ? primaryContentTypes : undefined) ??
    readStringArray('content_types')

  const compressedContextValue = root['compressed_context'] ?? nested['compressed_context']
  const metadataValue = root['metadata'] ?? nested['metadata']
  const compressed_context =
    compressedContextValue && typeof compressedContextValue === 'object'
      ? (compressedContextValue as Record<string, unknown>)
      : {}
  const metadata =
    metadataValue && typeof metadataValue === 'object'
      ? (metadataValue as Record<string, unknown>)
      : {}

  const requiredString = (key: string): string => {
    const value = readString(key)
    if (value === undefined) {
      throw new Error(`Missing required field after validation: ${key}`)
    }
    return value
  }

  return {
    input_as_text: requiredString('input_as_text'),
    client_id: requiredString('client_id'),
    client_name: requiredString('client_name'),
    goal: readString('goal'),
    platforms: readStringArray('platforms'),
    keywords: readStringArray('keywords'),
    contentTypes,
    compressed_customer_dna: readString('compressed_customer_dna'),
    prior_strategy_summary: readString('prior_strategy_summary'),
    prior_campaign_summary: readString('prior_campaign_summary'),
    website_summary: readString('website_summary'),
    product_summary: readString('product_summary'),
    regulatory_summary: readString('regulatory_summary'),
    competitor_summary: readString('competitor_summary'),
    compressed_context,
    metadata,
  }
}

function buildOrchestrationContext(
  requestId: string,
  payload: ReturnType<typeof mergePayload>
): OrchestrationContext {
  const keywords =
    payload.keywords ??
    (Array.isArray(payload.compressed_context?.['keywords'])
      ? (payload.compressed_context?.['keywords'] as string[])
      : [])

  return {
    requestId,
    originalRequest: {
      ...payload,
      clientName: payload.client_name,
      clientId: payload.client_id,
      keywords,
    },
    normalizedData: {
      clientId: payload.client_id,
      clientName: payload.client_name,
      keywords,
      platforms: payload.platforms ?? [],
      contentTypes: payload.contentTypes ?? [],
      audienceTargeting:
        (payload.compressed_context?.['audience'] as string | undefined) ??
        payload.metadata?.['audience'],
      productInfo:
        payload.product_summary ??
        (payload.compressed_context?.['product_positioning'] as string | undefined),
      companyInfo:
        payload.prior_campaign_summary ??
        payload.prior_strategy_summary ??
        (payload.compressed_context?.['campaign_history_summary'] as string | undefined),
      brandVoice: payload.compressed_context?.['brand_voice'] as string | undefined,
      input_as_text: payload.input_as_text,
    },
    steps: [],
    workingData: {},
    createdAt: Date.now(),
  }
}

function buildOrchestratorRequest(
  payload: ReturnType<typeof mergePayload>,
  normalization: NormalizationReportEnvelope
) {
  const normalizedBrief = normalization.rawNormalizedObjects?.campaignBrief
  const normalizedCustomer = normalization.rawNormalizedObjects?.customerContext

  const topic =
    payload.input_as_text?.trim() ||
    normalizedBrief?.context?.trim() ||
    normalizedBrief?.title?.trim()

  if (!topic) {
    throw new Error('campaign_topic is required for orchestration')
  }

  const businessContext = [
    payload.prior_strategy_summary,
    payload.prior_campaign_summary,
    payload.product_summary,
    payload.website_summary,
    payload.regulatory_summary,
    payload.competitor_summary,
  ]
    .filter(Boolean)
    .join('\n')
    .trim()

  const audience =
    normalizedCustomer?.audience ??
    (payload.compressed_context?.['audience'] as string | undefined)

  return {
    campaign_topic: topic.trim(),
    business_context: businessContext.length ? businessContext : undefined,
    audience,
  }
}

export type CampaignRunResult = {
  runMetadata: NormalizationMetadataRecord & { orchestration_status: 'completed' | 'failed' }
  normalizedCampaignPackage: NormalizationReportEnvelope
  orchestrationStatus: {
    status: 'completed' | 'failed'
    detail?: unknown
  }
  nextActions: NormalizationReportEnvelope['nextActions']
  warnings: string[]
  error?: string
  requestId: string
}

function extractMissingFields(issues: z.ZodIssue[], requiredFields: string[]): string[] {
  const missingFieldsFromIssues = issues.flatMap(issue => {
    if (issue.code === 'invalid_union') {
      return issue.unionErrors.flatMap(error =>
        error.issues
          .map(unionIssue => unionIssue.path?.[0])
          .filter((field): field is string => !!field && requiredFields.includes(field))
      )
    }
    const field = issue.path?.[0]
    return field && requiredFields.includes(field) ? [field as string] : []
  })
  return Array.from(new Set(missingFieldsFromIssues))
}

export async function executeCampaignRun(
  body: unknown,
  options: { orchestrator: CampaignRunOrchestrator }
): Promise<CampaignRunResult | { error: ValidationErrorPayload; status: number; requestId: string }> {
  const requestId = Security.createRequestId()
  const parsed = workflowPayloadSchema.safeParse(body)

  if (!parsed.success) {
    const requiredFields = ['input_as_text', 'client_id', 'client_name']
    const missing = extractMissingFields(parsed.error.issues, requiredFields)
    const details = parsed.error.issues.map(issue => ({
      field: issue.path.join('.') || 'payload',
      message: issue.message,
    }))

    return {
      error: {
        code: 'invalid_payload',
        message: 'Invalid workflow payload',
        issues: details,
        missing: missing.length ? missing : undefined,
      },
      status: 400,
      requestId,
    }
  }

  const merged = mergePayload(parsed.data as FlattenedWorkflowPayload)
  const normalizer = new NormalizerAgent()
  const normalizationContext = buildOrchestrationContext(requestId, merged)
  const normalization = await normalizer.process(normalizationContext)

  const metadata: NormalizationMetadataRecord = {
    run_id: requestId,
    client_id: merged.client_id,
    client_name: merged.client_name,
    workflow_version: normalization.runMetadata.workflowVersion,
    run_timestamp: normalization.runMetadata.runTimestamp,
    normalization_status: normalization.runMetadata.status,
  }

  campaignRunStore.add(metadata)

  const orchestratorRequest = buildOrchestratorRequest(merged, normalization)
  const orchestratorResult = await options.orchestrator.runCampaign(orchestratorRequest)

  const orchestrationStatus: CampaignRunResult['orchestrationStatus'] = orchestratorResult.success
    ? { status: 'completed', detail: orchestratorResult.data }
    : { status: 'failed', detail: orchestratorResult.error }

  const warnings: string[] = []
  if (normalization.normalizationChecksum.missingInputsCount > 0) {
    warnings.push(`Missing inputs: ${normalization.normalizationChecksum.missingInputsCount}`)
  }
  if (normalization.normalizationChecksum.compressionNotesCount > 0) {
    warnings.push(`Compression notes: ${normalization.normalizationChecksum.compressionNotesCount}`)
  }

  return {
    runMetadata: { ...metadata, orchestration_status: orchestrationStatus.status },
    normalizedCampaignPackage: normalization,
    orchestrationStatus,
    nextActions: normalization.nextActions,
    warnings,
    error: orchestratorResult.success ? undefined : orchestratorResult.error,
    requestId,
  }
}
