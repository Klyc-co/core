import { supabase } from "@/integrations/supabase/client";

export type BrainDocumentType =
  | "brand_profile"
  | "voice_profile"
  | "strategy_profile"
  | "examples_cache"
  | "analytics_history"
  | "campaign_history";

export const BRAIN_DOCUMENT_TYPES: BrainDocumentType[] = [
  "brand_profile",
  "voice_profile",
  "strategy_profile",
  "examples_cache",
  "analytics_history",
  "campaign_history",
];

export interface BrandProfile {
  companyDescription?: string;
  productCategories?: string[];
  positioning?: string;
}

export interface VoiceProfile {
  tone?: string;
  writingStyle?: string;
  sentenceStructure?: string;
  emojiUsage?: string;
  voiceEmbeddingReference?: string;
}

export interface StrategyProfile {
  messagingPillars?: string[];
  funnelGoals?: string[];
  targetAudience?: string;
}

export interface ExamplesCache {
  approvedExamples?: Array<{ content: string; platform?: string; date?: string }>;
  rejectedExamples?: Array<{ content: string; reason?: string; date?: string }>;
}

export interface AnalyticsHistory {
  snapshots?: Array<{
    date: string;
    platform: string;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    engagementRate?: number;
  }>;
}

export interface CampaignHistory {
  campaigns?: Array<{
    id: string;
    name?: string;
    contentType?: string;
    platforms?: string[];
    createdAt: string;
    performance?: { views?: number; engagement?: number };
  }>;
}

type BrainDataMap = {
  brand_profile: BrandProfile;
  voice_profile: VoiceProfile;
  strategy_profile: StrategyProfile;
  examples_cache: ExamplesCache;
  analytics_history: AnalyticsHistory;
  campaign_history: CampaignHistory;
};

/**
 * Load a single brain document for a client.
 */
export async function loadBrainDocument<T extends BrainDocumentType>(
  clientId: string,
  documentType: T
): Promise<BrainDataMap[T] | null> {
  const { data, error } = await supabase
    .from("client_brain" as any)
    .select("data")
    .eq("client_id", clientId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load brain document ${documentType}:`, error);
    return null;
  }
  return (data as any)?.data ?? null;
}

/**
 * Load the full client brain (all 6 documents).
 */
export async function loadFullBrain(clientId: string): Promise<Record<BrainDocumentType, any>> {
  const { data, error } = await supabase
    .from("client_brain" as any)
    .select("document_type, data")
    .eq("client_id", clientId);

  const brain: Record<string, any> = {};
  for (const docType of BRAIN_DOCUMENT_TYPES) {
    brain[docType] = {};
  }

  if (!error && data) {
    for (const row of data as any[]) {
      brain[row.document_type] = row.data;
    }
  }

  return brain as Record<BrainDocumentType, any>;
}

/**
 * Save (upsert) a brain document for a client.
 */
export async function saveBrainDocument<T extends BrainDocumentType>(
  clientId: string,
  documentType: T,
  documentData: BrainDataMap[T]
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("client_brain" as any)
    .upsert(
      {
        user_id: user.id,
        client_id: clientId,
        document_type: documentType,
        data: documentData,
      } as any,
      { onConflict: "client_id,document_type" }
    );

  if (error) {
    console.error(`Failed to save brain document ${documentType}:`, error);
    return false;
  }
  return true;
}

/**
 * Initialize all brain documents for a client with defaults if they don't exist.
 */
export async function initializeBrain(clientId: string): Promise<void> {
  const existing = await loadFullBrain(clientId);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const missing = BRAIN_DOCUMENT_TYPES.filter(
    (dt) => !existing[dt] || Object.keys(existing[dt]).length === 0
  );

  if (missing.length === 0) return;

  const rows = missing.map((dt) => ({
    user_id: user.id,
    client_id: clientId,
    document_type: dt,
    data: {},
  }));

  await supabase.from("client_brain" as any).upsert(rows as any, {
    onConflict: "client_id,document_type",
  });
}
