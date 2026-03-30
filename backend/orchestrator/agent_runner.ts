/**
 * KLYC Agent Runner
 * Executes agents with timeout, retry, step limits, and response size guardrails.
 * Re-exports from execution_guardrails for backward compatibility.
 */

export { executeAgent, DEFAULT_GUARDRAILS } from '../utils/execution_guardrails'
export type { GuardrailConfig } from '../utils/execution_guardrails'
