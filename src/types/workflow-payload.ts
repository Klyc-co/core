/**
 * KLYC Workflow Input Contract
 * All campaign and strategy surfaces must produce this shape before submission.
 */
export interface WorkflowPayload {
  /** Free-text campaign brief / user intent */
  input_as_text: string;
  /** Active client UUID */
  client_id: string;
  /** Display name of the active client */
  client_name: string;
  /** Compressed Customer DNA blob (preloaded from client_brain) */
  compressed_customer_dna: string | null;
  /** Prior strategy summary (preloaded) */
  prior_strategy_summary: string | null;
  /** Prior campaign summary (preloaded) */
  prior_campaign_summary: string | null;
  /** Website intelligence summary */
  website_summary: string | null;
  /** Product catalog / positioning summary */
  product_summary: string | null;
  /** Regulatory landscape summary */
  regulatory_summary: string | null;
  /** Competitor intelligence summary */
  competitor_summary: string | null;
}

/** Returns true when the payload has enough data to submit */
export function isPayloadReady(p: Partial<WorkflowPayload>): boolean {
  return Boolean(p.input_as_text?.trim() && p.client_id?.trim());
}
