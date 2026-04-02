// ============================================================
// KLYC KNP Codec — Shared compression/decompression primitives
// Extracted for reuse across Normalizer, Orchestrator, Pipeline
// ============================================================

// ── KNP Field Keys ──

export const KNP = {
  // Input keys
  ξb: "ξb", // campaignBrief
  ζq: "ζq", // targetAudience
  μp: "μp", // productInfo
  θc: "θc", // competitiveContext
  λv: "λv", // brandVoice
  κw: "κw", // keywords
  πf: "πf", // platforms
  σo: "σo", // objective
  // Output keys
  ρr: "ρr", // researchOutput
  φd: "φd", // productOutput
  ηn: "ηn", // narrativeOutput
  ωs: "ωs", // socialOutput
  δi: "δi", // imageOutput
  εe: "εe", // editorOutput
  αa: "αa", // approvalOutput
  χy: "χy", // analyticsOutput
  ψv: "ψv", // viralScore
} as const;

export type KNPFieldKey = (typeof KNP)[keyof typeof KNP];

export const INPUT_FIELD_MAP: Record<string, string> = {
  campaignBrief: KNP.ξb,
  targetAudience: KNP.ζq,
  productInfo: KNP.μp,
  competitiveContext: KNP.θc,
  brandVoice: KNP.λv,
  keywords: KNP.κw,
  platforms: KNP.πf,
  objective: KNP.σo,
};

export const OUTPUT_KEY_MAP: Record<string, string> = {
  research: KNP.ρr,
  product: KNP.φd,
  narrative: KNP.ηn,
  social: KNP.ωs,
  image: KNP.δi,
  editor: KNP.εe,
  approval: KNP.αa,
  analytics: KNP.χy,
};

// ── KNP Format Constants ──

export const KNP_VERSION = "Ψ3";
export const KNP_FIELD_SEPARATOR = "∷";
export const KNP_VALUE_JOINER = "⊕";
export const KNP_NULL_MARKER = "∅";

// ── KNP Packet ──

export interface KNPPacket {
  version: string;
  checksum: string;
  timestamp: number;
  segments: Record<string, string>;
  session_id?: string;
}

// ── Core Functions ──

export function compressValue(val: unknown): string {
  if (val === null || val === undefined) return KNP_NULL_MARKER;
  const s = typeof val === "string" ? val : JSON.stringify(val);
  return s.trim().slice(0, 400);
}

export function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("|");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return "Ψ" + Math.abs(h).toString(36);
}

export function validateChecksum(packet: KNPPacket): boolean {
  const expected = knpChecksum(packet.segments);
  return packet.checksum === expected;
}

export function buildKNPPacket(
  input: Record<string, unknown>,
  sessionId?: string
): KNPPacket {
  const segments: Record<string, string> = {};
  for (const [field, key] of Object.entries(INPUT_FIELD_MAP)) {
    const v = input[field];
    if (v !== undefined && v !== null && v !== "") {
      segments[key] = compressValue(v);
    }
  }
  return {
    version: KNP_VERSION,
    checksum: knpChecksum(segments),
    timestamp: Date.now(),
    segments,
    session_id: sessionId,
  };
}

export function serializePacket(packet: KNPPacket): string {
  const parts: string[] = [`v${KNP_FIELD_SEPARATOR}${packet.version}`];
  parts.push(`cs${KNP_FIELD_SEPARATOR}${packet.checksum}`);
  parts.push(`ts${KNP_FIELD_SEPARATOR}${packet.timestamp}`);
  if (packet.session_id) {
    parts.push(`sid${KNP_FIELD_SEPARATOR}${packet.session_id}`);
  }
  for (const [key, val] of Object.entries(packet.segments)) {
    parts.push(`${key}${KNP_FIELD_SEPARATOR}${val}`);
  }
  return parts.join(KNP_VALUE_JOINER);
}

export function deserializePacket(raw: string): KNPPacket | null {
  try {
    // Try JSON first (most payloads are JSON)
    const parsed = JSON.parse(raw);
    if (parsed.version && parsed.segments) return parsed as KNPPacket;
    // If it's a flat KNP object with field keys, wrap it
    if (parsed.version === KNP_VERSION) {
      const segments: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k !== "version" && k !== "checksum" && k !== "timestamp" && k !== "session_id") {
          segments[k] = String(v);
        }
      }
      return {
        version: parsed.version,
        checksum: parsed.checksum || knpChecksum(segments),
        timestamp: parsed.timestamp || Date.now(),
        segments,
        session_id: parsed.session_id,
      };
    }
    return null;
  } catch {
    // Try KNP native format
    const parts = raw.split(KNP_VALUE_JOINER);
    if (parts.length < 2) return null;

    const segments: Record<string, string> = {};
    let version = KNP_VERSION;
    let checksum = "";
    let timestamp = Date.now();
    let sessionId: string | undefined;

    for (const part of parts) {
      const [key, ...rest] = part.split(KNP_FIELD_SEPARATOR);
      const val = rest.join(KNP_FIELD_SEPARATOR);
      if (key === "v") version = val;
      else if (key === "cs") checksum = val;
      else if (key === "ts") timestamp = parseInt(val, 10) || Date.now();
      else if (key === "sid") sessionId = val;
      else segments[key] = val;
    }

    return { version, checksum, timestamp, segments, session_id: sessionId };
  }
}

/**
 * Decompress a KNP packet to human-readable key-value pairs.
 */
export function decompressPacket(packet: KNPPacket): Record<string, string> {
  // Reverse map: KNP key → human label
  const reverseInput: Record<string, string> = {};
  for (const [label, key] of Object.entries(INPUT_FIELD_MAP)) {
    reverseInput[key] = label;
  }
  const reverseOutput: Record<string, string> = {};
  for (const [label, key] of Object.entries(OUTPUT_KEY_MAP)) {
    reverseOutput[key] = label;
  }

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(packet.segments)) {
    const label = reverseInput[key] || reverseOutput[key] || key;
    result[label] = val === KNP_NULL_MARKER ? "" : val;
  }
  return result;
}
