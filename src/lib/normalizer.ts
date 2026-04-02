// ============================================================
// KLYC Normalizer Service — Persistent Membrane Layer
// Wraps knp-codec.ts into a session-aware compression membrane.
// Every inbound user message → KNP. Every outbound response → human text.
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

// ── Types ──

export interface SessionContext {
  session_id: string;
  client_id: string;
  mode: "guided" | "solo";
  prior_fields?: Record<string, string>;
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

// ── Extended KNP keys for new data types ──

const EXT_KEYS = {
  IMG: "ΩI",    // image reference
  CHART: "ΩC",  // chart descriptor
  LEARN: "ΩL",  // learning signal
  COMP: "ΩA",   // competitor alert
} as const;

// ============================================================
// NormalizerService
// ============================================================

export class NormalizerService {
  private sessionId: string;
  private clientId: string;
  private decompressionCache: Map<string, Record<string, string>> = new Map();
  private errorLog: NormalizerError[] = [];

  constructor(context: SessionContext) {
    this.sessionId = context.session_id;
    this.clientId = context.client_id;
  }

  // ── Core: Compress ──

  /**
   * Compress raw user text into a serialized KNP payload string.
   * Attempts to extract structured fields from natural language,
   * falling back to storing the entire message as campaignBrief.
   */
  compress(userInput: string, context: SessionContext): string {
    const fields = this.extractFieldsFromText(userInput);

    // Merge any prior session fields
    if (context.prior_fields) {
      for (const [k, v] of Object.entries(context.prior_fields)) {
        if (!fields[k]) fields[k] = v;
      }
    }

    const packet = buildKNPPacket(fields, this.sessionId);
    this.decompressionCache.set(packet.checksum, packet.segments);
    return serializePacket(packet);
  }

  // ── Core: Decompress ──

  /**
   * Decompress a KNP payload string into human-readable text.
   */
  decompress(knpPayload: string): string {
    const packet = deserializePacket(knpPayload);
    if (!packet) {
      // Not a KNP payload — return as-is (already human-readable)
      return knpPayload;
    }

    if (!this.validate(knpPayload)) {
      this.logError(knpPayload, "checksum_mismatch");
      return "[Transmission error — requesting re-send]";
    }

    const fields = decompressPacket(packet);

    // Cache for session consistency
    this.decompressionCache.set(packet.checksum, packet.segments);

    // Build human-readable output
    const parts: string[] = [];
    for (const [label, value] of Object.entries(fields)) {
      if (!value || value === KNP_NULL_MARKER) continue;
      parts.push(value);
    }

    return parts.join("\n\n") || knpPayload;
  }

  // ── Core: Validate ──

  validate(knpPayload: string): boolean {
    const packet = deserializePacket(knpPayload);
    if (!packet) return false;
    return validateChecksum(packet);
  }

  // ── Streaming: Compress ──

  async *compressStream(
    inputStream: ReadableStream<string>
  ): AsyncGenerator<string> {
    const reader = inputStream.getReader();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;

        // Flush on sentence boundaries
        const sentences = buffer.split(/(?<=[.!?])\s+/);
        if (sentences.length > 1) {
          const toCompress = sentences.slice(0, -1).join(" ");
          buffer = sentences[sentences.length - 1];

          const context: SessionContext = {
            session_id: this.sessionId,
            client_id: this.clientId,
            mode: "guided",
          };
          yield this.compress(toCompress, context);
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        const context: SessionContext = {
          session_id: this.sessionId,
          client_id: this.clientId,
          mode: "guided",
        };
        yield this.compress(buffer.trim(), context);
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ── Streaming: Decompress ──

  async *decompressStream(
    knpStream: AsyncGenerator<string>
  ): AsyncGenerator<string> {
    for await (const chunk of knpStream) {
      yield this.decompress(chunk);
    }
  }

  // ── Extended: Image Reference ──

  compressImageRef(imageRef: ImageRef): string {
    const val = [
      imageRef.url,
      imageRef.platform,
      `${imageRef.width}x${imageRef.height}`,
    ].join(KNP_FIELD_SEPARATOR);

    return `${EXT_KEYS.IMG}${KNP_FIELD_SEPARATOR}${val}`;
  }

  // ── Extended: Chart Descriptor ──

  compressChartDescriptor(chart: ChartDescriptor): string {
    const dataStr = chart.dataPoints.map(String).join(",");
    const labelStr = chart.labels.join(",");
    const val = [chart.type, dataStr, labelStr].join(KNP_FIELD_SEPARATOR);

    return `${EXT_KEYS.CHART}${KNP_FIELD_SEPARATOR}${val}`;
  }

  // ── Extended: Learning Signal ──

  compressLearningSignal(signal: LearningSignal): string {
    const val = [
      signal.pattern,
      String(signal.confidence),
      signal.campaignId,
    ].join(KNP_FIELD_SEPARATOR);

    return `${EXT_KEYS.LEARN}${KNP_FIELD_SEPARATOR}${val}`;
  }

  // ── Extended: Competitor Alert ──

  compressCompetitorAlert(alert: CompetitorAlert): string {
    const val = [
      alert.observed,
      alert.inferred,
      String(alert.confidence),
      alert.relevance,
    ].join(KNP_FIELD_SEPARATOR);

    return `${EXT_KEYS.COMP}${KNP_FIELD_SEPARATOR}${val}`;
  }

  // ── Error Handling ──

  getErrors(): NormalizerError[] {
    return [...this.errorLog];
  }

  clearErrors(): void {
    this.errorLog = [];
  }

  // ── Internal Helpers ──

  /**
   * Extract structured KNP fields from free-form user text.
   * Uses keyword detection to map text segments to field keys.
   */
  private extractFieldsFromText(text: string): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      campaignBrief: text, // Always store the full text as brief
    };

    const lower = text.toLowerCase();

    // Audience detection
    const audiencePatterns = [
      /(?:target(?:ing)?|audience|for)\s+(.+?)(?:\.|,|$)/i,
      /(?:aimed at|designed for|speaking to)\s+(.+?)(?:\.|,|$)/i,
    ];
    for (const pattern of audiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        fields.targetAudience = match[1].trim();
        break;
      }
    }

    // Platform detection
    const platforms: string[] = [];
    const platformNames = [
      "instagram", "linkedin", "twitter", "tiktok",
      "youtube", "facebook", "threads", "pinterest",
    ];
    for (const p of platformNames) {
      if (lower.includes(p)) platforms.push(p);
    }
    if (platforms.length > 0) {
      fields.platforms = platforms;
    }

    // Objective detection
    const objectives = [
      "awareness", "engagement", "conversion", "traffic",
      "leads", "sales", "brand", "growth",
    ];
    for (const obj of objectives) {
      if (lower.includes(obj)) {
        fields.objective = obj;
        break;
      }
    }

    // Keyword extraction (quoted phrases)
    const keywords = [...text.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    if (keywords.length > 0) {
      fields.keywords = keywords;
    }

    return fields;
  }

  private logError(payload: string, errorType: string): void {
    this.errorLog.push({
      session_id: this.sessionId,
      payload_fragment: payload.slice(0, 200),
      error_type: errorType,
      timestamp: new Date().toISOString(),
    });
  }
}

// ── Factory ──

export function createNormalizer(context: SessionContext): NormalizerService {
  return new NormalizerService(context);
}

// Re-export codec for convenience
export {
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
