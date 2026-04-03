// ============================================================
// KLYC Normalizer Service — Membrane Layer v2.1
// Wraps ALL user ↔ system communication
// NOT a pipeline stage — a boundary protocol enforcer
// ============================================================

import {
  KNP,
  KNP_VERSION,
  KNP_FIELD_SEPARATOR,
  KNP_VALUE_JOINER,
  KNP_NULL_MARKER,
  type KNPPacket,
  compressValue,
  knpChecksum,
  validateChecksum,
  buildKNPPacket,
  serializePacket,
  deserializePacket,
  decompressPacket,
  INPUT_FIELD_MAP,
  OUTPUT_KEY_MAP,
} from "./knp-codec";

import {
  SubmindEnum,
  SUBMIND_NAMES,
  KNP_V2_ALPHA,
  knpV2Encode,
  knpV2Decode,
  computeCRC16,
  type ChannelA,
  type ChannelB,
  type KNPv2Packet,
  type AlphaKey,
} from "./knp-codec-v2";

// ── Types ──

export interface SessionContext {
  session_id?: string;
  client_id?: string;
  mode?: "guided" | "solo";
  intent?: string;
  accumulated?: Record<string, unknown>;
  prior_fields?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface UnwrapResult {
  data: Record<string, string>;
  confidence: number;
  source: SubmindEnum;
}

export interface ImageRef {
  url: string;
  platform: string;
  width: number;
  height: number;
}

export interface ChartDescriptor {
  type: string;
  dataPoints: number[];
  labels: string[];
}

export interface LearningSignal {
  pattern: string;
  confidence: number;
  campaignId: string;
}

export interface CompetitorAlert {
  observed: string;
  inferred: string;
  confidence: number;
  relevance: "HIGH" | "MEDIUM" | "LOW";
}

export interface NormalizerError {
  session_id: string;
  payload_fragment: string;
  error_type: string;
  timestamp: string;
}

// ── Extended KNP keys ──

const EXT_KEYS = {
  IMG: "ΩI",
  CHART: "ΩC",
  LEARN: "ΩL",
  COMP: "ΩA",
} as const;

// ── Field extraction ──

const PLATFORM_KEYWORDS = [
  "instagram", "linkedin", "twitter", "tiktok", "youtube",
  "facebook", "threads", "pinterest", "x.com",
];

const OBJECTIVE_KEYWORDS = [
  "awareness", "engagement", "conversion", "traffic",
  "leads", "sales", "brand", "growth", "retention",
];

function extractFieldsFromText(text: string): Record<string, unknown> {
  const fields: Record<string, unknown> = { campaignBrief: text };
  const lower = text.toLowerCase();

  const audPatterns = [
    /(?:target(?:ing)?|audience|for)\s+(.+?)(?:\.|,|$)/i,
    /(?:aimed at|designed for|speaking to)\s+(.+?)(?:\.|,|$)/i,
  ];
  for (const p of audPatterns) {
    const m = text.match(p);
    if (m) { fields.targetAudience = m[1].trim(); break; }
  }

  const platforms = PLATFORM_KEYWORDS.filter((p) => lower.includes(p));
  if (platforms.length > 0) fields.platforms = platforms;

  for (const obj of OBJECTIVE_KEYWORDS) {
    if (lower.includes(obj)) { fields.objective = obj; break; }
  }

  const quoted = text.match(/"([^"]+)"/g)?.map((q) => q.replace(/"/g, ""));
  const hashtags = text.match(/#\w+/g)?.map((h) => h.slice(1));
  const kw = [...(quoted || []), ...(hashtags || [])];
  if (kw.length > 0) fields.keywords = kw;

  return fields;
}

// ── Submind field relevance map ──

const SUBMIND_FIELDS: Record<SubmindEnum, string[]> = {
  [SubmindEnum.ORCHESTRATOR]: Object.values(KNP),
  [SubmindEnum.RESEARCH]: [KNP.ξb, KNP.ζq, KNP.κw, KNP.θc, KNP.σo],
  [SubmindEnum.PRODUCT]: [KNP.ξb, KNP.μp, KNP.θc, KNP.λv],
  [SubmindEnum.NARRATIVE]: [KNP.ξb, KNP.ζq, KNP.λv, KNP.ρr, KNP.φd],
  [SubmindEnum.CREATIVE]: [KNP.ξb, KNP.ζq, KNP.πf, KNP.λv, KNP.ηn],
  [SubmindEnum.VIRAL]: [KNP.ωs, KNP.ζq, KNP.πf],
  [SubmindEnum.SOCIAL]: [KNP.ξb, KNP.πf, KNP.ζq, KNP.ωs, KNP.κw],
  [SubmindEnum.IMAGE]: [KNP.ξb, KNP.δi, KNP.πf, KNP.λv],
  [SubmindEnum.ANALYTICS]: [KNP.χy, KNP.πf, KNP.ψv],
  [SubmindEnum.APPROVAL]: [KNP.ξb, KNP.ωs, KNP.δi, KNP.ηn, KNP.εe],
  [SubmindEnum.LEARNING]: [KNP.χy, KNP.ψv, KNP.ρr],
};

// ── Reverse key maps ──

const REVERSE_INPUT: Record<string, string> = {};
for (const [label, key] of Object.entries(INPUT_FIELD_MAP)) {
  REVERSE_INPUT[key] = label;
}
const REVERSE_OUTPUT: Record<string, string> = {};
for (const [label, key] of Object.entries(OUTPUT_KEY_MAP)) {
  REVERSE_OUTPUT[key] = label;
}

// ============================================================
// NormalizerService
// ============================================================

export class NormalizerService {
  private errorLog: NormalizerError[] = [];
  private decompressionCache: Map<string, Record<string, string>> = new Map();

  /**
   * Compress human-readable text into a KNP Ψ3 packet
   */
  compress(userInput: string, context?: SessionContext): KNPPacket {
    const fields = extractFieldsFromText(userInput);

    if (context?.prior_fields) {
      for (const [k, v] of Object.entries(context.prior_fields)) {
        if (!(k in fields)) fields[k] = v;
      }
    }
    if (context?.accumulated) {
      for (const [k, v] of Object.entries(context.accumulated)) {
        if (!(k in fields) && v !== undefined && v !== null) {
          fields[k] = v;
        }
      }
    }

    const segments: Record<string, string> = {};
    for (const [field, key] of Object.entries(INPUT_FIELD_MAP)) {
      const v = fields[field];
      if (v !== undefined && v !== null && v !== "") {
        segments[key] = compressValue(v);
      }
    }

    const packet: KNPPacket = {
      version: KNP_VERSION,
      checksum: knpChecksum(segments),
      timestamp: Date.now(),
      segments,
      session_id: context?.session_id,
    };

    this.decompressionCache.set(packet.checksum, packet.segments);
    return packet;
  }

  /**
   * Decompress a KNP packet back to human-readable text
   */
  decompress(knpPacket: KNPPacket): string {
    const pairs = decompressPacket(knpPacket);
    const parts: string[] = [];

    if (pairs.campaignBrief) parts.push(pairs.campaignBrief);

    const meta: string[] = [];
    if (pairs.targetAudience) meta.push(`Target: ${pairs.targetAudience}`);
    if (pairs.platforms) meta.push(`Platforms: ${pairs.platforms}`);
    if (pairs.objective) meta.push(`Objective: ${pairs.objective}`);
    if (pairs.keywords) meta.push(`Keywords: ${pairs.keywords}`);
    if (pairs.brandVoice) meta.push(`Voice: ${pairs.brandVoice}`);
    if (pairs.productInfo) meta.push(`Product: ${pairs.productInfo}`);
    if (pairs.competitiveContext) meta.push(`Competitive: ${pairs.competitiveContext}`);

    for (const key of ["research", "product", "narrative", "social", "image", "editor", "approval", "analytics"]) {
      if (pairs[key]) meta.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${pairs[key]}`);
    }

    if (meta.length > 0) parts.push(meta.join(" | "));
    return parts.join("\n").trim() || "Empty packet";
  }

  /**
   * Validate a KNP packet for integrity
   */
  validate(packet: KNPPacket): ValidationResult {
    const errors: string[] = [];

    if (packet.version !== KNP_VERSION) {
      errors.push(`Version mismatch: expected ${KNP_VERSION}, got ${packet.version}`);
    }
    if (!validateChecksum(packet)) {
      errors.push("Checksum verification failed");
    }
    if (!packet.timestamp || packet.timestamp <= 0) {
      errors.push("Missing or invalid timestamp");
    }
    if (Object.keys(packet.segments).length === 0) {
      errors.push("Empty segments — no data in packet");
    }
    const brief = packet.segments[KNP.ξb];
    if (!brief || brief === KNP_NULL_MARKER) {
      errors.push("Missing campaign brief (ξb)");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Wrap data in a KNP envelope for a specific submind (extracts relevant fields only)
   */
  wrapForSubmind(data: Record<string, unknown>, targetSubmind: SubmindEnum): KNPPacket {
    const relevantKeys = SUBMIND_FIELDS[targetSubmind] || Object.values(KNP);
    const segments: Record<string, string> = {};

    for (const key of relevantKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        segments[key] = compressValue(data[key]);
        continue;
      }
      const humanKey = REVERSE_INPUT[key] || REVERSE_OUTPUT[key];
      if (humanKey && data[humanKey] !== undefined && data[humanKey] !== null) {
        segments[key] = compressValue(data[humanKey]);
      }
    }

    return {
      version: KNP_VERSION,
      checksum: knpChecksum(segments),
      timestamp: Date.now(),
      segments,
    };
  }

  /**
   * Unwrap a submind response packet
   */
  unwrapFromSubmind(packet: KNPPacket): UnwrapResult {
    const data = decompressPacket(packet);

    let confidence = 1.0;
    const confStr = packet.segments["_conf"] || packet.segments["confidence"];
    if (confStr) {
      const parsed = parseFloat(confStr);
      if (!isNaN(parsed)) confidence = Math.min(1, Math.max(0, parsed));
    }

    let source = SubmindEnum.ORCHESTRATOR;
    const srcStr = packet.segments["_src"] || packet.segments["source"];
    if (srcStr) {
      const entry = Object.entries(SUBMIND_NAMES).find(([, name]) => name === srcStr);
      if (entry) source = parseInt(entry[0]) as SubmindEnum;
    }

    return { data, confidence, source };
  }

  /**
   * Build a v2.1 telegram packet with full 3-phase handshake data
   */
  buildTelegram(
    source: SubmindEnum,
    target: SubmindEnum | SubmindEnum[],
    actionFunctions: Array<{ key: AlphaKey; value: string }>,
    trace: { hashes: string[]; confidence: number; rejected?: string[]; sourceRef?: string },
  ): KNPv2Packet {
    const channelA: ChannelA = { functions: actionFunctions };
    const channelB: ChannelB = {
      trace: trace.hashes.map((h) => `#${h}`).join("→"),
      confidence: trace.confidence,
      rejected: (trace.rejected || []).map((r) => `#${r}`),
      source_ref: trace.sourceRef || "INT",
    };
    return knpV2Encode(source, target, channelA, channelB);
  }

  // ── Extended Compression ──

  compressImageRef(ref: ImageRef): string {
    return `${EXT_KEYS.IMG}${KNP_FIELD_SEPARATOR}${ref.url}${KNP_FIELD_SEPARATOR}${ref.platform}${KNP_FIELD_SEPARATOR}${ref.width}x${ref.height}`;
  }

  compressChartDescriptor(chart: ChartDescriptor): string {
    return `${EXT_KEYS.CHART}${KNP_FIELD_SEPARATOR}${chart.type}${KNP_FIELD_SEPARATOR}${chart.dataPoints.join(",")}${KNP_FIELD_SEPARATOR}${chart.labels.join(",")}`;
  }

  compressLearningSignal(signal: LearningSignal): string {
    return `${EXT_KEYS.LEARN}${KNP_FIELD_SEPARATOR}${signal.pattern}${KNP_FIELD_SEPARATOR}${signal.confidence}${KNP_FIELD_SEPARATOR}${signal.campaignId}`;
  }

  compressCompetitorAlert(alert: CompetitorAlert): string {
    return `${EXT_KEYS.COMP}${KNP_FIELD_SEPARATOR}${alert.observed}${KNP_FIELD_SEPARATOR}${alert.inferred}${KNP_FIELD_SEPARATOR}${alert.confidence}${KNP_FIELD_SEPARATOR}${alert.relevance}`;
  }

  // ── Error Log ──

  getErrors(): NormalizerError[] { return [...this.errorLog]; }
  clearErrors(): void { this.errorLog = []; }
}

// ── Singleton Export ──
export const normalizer = new NormalizerService();

// ── Factory (backward compat) ──
export function createNormalizer(_context?: SessionContext): NormalizerService {
  return new NormalizerService();
}

// ── Re-exports ──
export {
  KNP, KNP_VERSION, KNP_FIELD_SEPARATOR, KNP_VALUE_JOINER, KNP_NULL_MARKER,
  compressValue, knpChecksum, validateChecksum,
  buildKNPPacket, serializePacket, deserializePacket, decompressPacket,
  INPUT_FIELD_MAP, OUTPUT_KEY_MAP,
} from "./knp-codec";
export type { KNPPacket } from "./knp-codec";
