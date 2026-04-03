/**
 * KLYC Execution Guardrails
 * Timeout, retry, step limits, and response size enforcement.
 */

import type { Submind, SubmindInput, SubmindOutput } from '../subminds/submind_interface'

export interface GuardrailConfig {
  timeoutMs: number
  maxRetries: number
  maxSteps: number
  maxResponseSizeBytes: number
}

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  timeoutMs: 15000,
  maxRetries: 2,
  maxSteps: 50,
  maxResponseSizeBytes: 20480, // 20KB
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Submind timeout after ${ms}ms`)), ms)
    promise
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(err => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

function validateResponseSize(output: SubmindOutput, maxBytes: number): void {
  const size = new TextEncoder().encode(JSON.stringify(output)).length
  if (size > maxBytes) {
    throw new Error(`Submind response exceeds ${maxBytes} bytes (got ${size})`)
  }
}

export async function executeSubmind(
  submind: Submind,
  input: SubmindInput,
  config: Partial<GuardrailConfig> = {}
): Promise<SubmindOutput> {
  const guardrails = { ...DEFAULT_GUARDRAILS, ...config }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= guardrails.maxRetries; attempt++) {
    try {
      const result = await withTimeout(submind.execute(input), guardrails.timeoutMs)
      validateResponseSize(result, guardrails.maxResponseSizeBytes)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < guardrails.maxRetries) {
        continue
      }
    }
  }

  return {
    submind: submind.name,
    status: 'error',
    data: null,
    error: lastError?.message ?? 'Unknown error after retries',
    timestamp: new Date().toISOString(),
  }
}

// Backward-compatible alias
export const executeAgent = executeSubmind
