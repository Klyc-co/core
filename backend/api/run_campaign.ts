/**
 * KLYC Campaign API Endpoint
 * Entry point for campaign execution.
 * Wires together the campaign runner and orchestrator.
 */

import { executeCampaignRun } from '../services/campaign-runner'
import { orchestrator } from '../orchestrator/klyc_orchestrator'
import { Security } from '../services/security'

/**
 * Main campaign execution handler.
 * Accepts a request body, validates, normalizes, and runs the full agent pipeline.
 *
 * Expected body: WorkflowIntakeRequest (see models/types.ts)
 * Returns: CampaignRunResult or validation error
 */
export async function handleCampaignRun(
  body: unknown,
  headers?: Record<string, string | undefined>
) {
  // Authenticate if auth is configured
  try {
    Security.authenticate(headers)
  } catch (error) {
    return {
      status: 401,
      body: {
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Authentication failed',
      },
    }
  }

  // Execute the campaign
  const result = await executeCampaignRun(body, { orchestrator })

  // Check if it's a validation error
  if ('status' in result && 'error' in result) {
    return {
      status: result.status,
      body: result.error,
    }
  }

  // Success
  return {
    status: 200,
    body: result,
  }
}
