// ============================================================
// KNP v2.1 Telegram Integrity Protocol
// Three-phase handshake codec for reliable submind communication
// Backward-compatible: re-exports everything from knp-codec.ts
// ============================================================

// ── Re-export v1 for backward compatibility ──
export {
  KNP, KNPFieldKey, INPUT_FIELD_MAP, OUTPUT_KEY_MAP,
  KNP_VERSION, KNP_FIELD_SEPARATOR, KNP_VALUE_JOINER, KNP_NULL_MARKER,
  KNPPacket, compressValue, knpChecksum, validateChecksum,
  buildKNPPacket, serializePacket, deserializePacket, decompressPacket,
} from "./knp-codec";

// ── Submind Enum (4-bit addressing) ──

export enum SubmindEnum {
  ORCHESTRATOR = 0b0000,
  RESEARCH     = 0b0001,
  PRODUCT      = 0b0010,
  NARRATIVE    = 0b0011,
  CREATIVE     = 0b0100,
  VIRAL        = 0b0101,
  SOCIAL       = 0b0110,
  IMAGE        = 0b0111,
  ANALYTICS    = 0b1000,
  APPROVAL     = 0b1001,
  LEARNING     = 0b1010,
}

export const SUBMIND_NAMES: Record<SubmindEnum, string> = {
  [SubmindEnum.ORCHESTRATOR]: "orchestrator",
  [SubmindEnum.RESEARCH]: "research",
  [SubmindEnum.PRODUCT]: "product",
  [SubmindEnum.NARRATIVE]: "narrative",
  [SubmindEnum.CREATIVE]: "creative",
  [SubmindEnum.VIRAL]: "viral",
  [SubmindEnum.SOCIAL]: "social",
  [SubmindEnum.IMAGE]: "image",
  [SubmindEnum.ANALYTICS]: "analytics",
  [SubmindEnum.APPROVAL]: "approval",
  [SubmindEnum.LEARNING]: "learning",
};

// ── Channel A Reconstruction Alphabet ──

export const KNP_V2_ALPHA = {
  Ψ: "envelope",
  Δ: "demographics",
  Φ: "format",
  Ω: "emotion",
  VS: "viral_score",
  T: "timing",
  A: "audio",
  V: "voice",
  Σ: "synthesis",
  Λ: "learning",
  Γ: "guardrail",
  Π: "product",
  Ν: "narrative",
  Ρ: "research",
  Χ: "cross_submind_query",
} as const;

export type AlphaKey = keyof typeof KNP_V2_ALPHA;

// ── CRC-16 (CCITT) ──

export function computeCRC16(data: string): number {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return crc & 0xFFFF;
}

// ── v2.1 Packet Types ──

export type AckStatus = "OK" | "MISMATCH" | "RETRY" | "REJECT";

export interface PreSendHeader {
  packet_id: number;
  source: SubmindEnum;
  target: number; // 10-bit bitmask for multicast
  channel_a_tokens: number;
  channel_b_tokens: number;
  payload_checksum: number;
  total_size: number;
}

export interface ChannelA {
  functions: Array<{ key: AlphaKey; value: string }>;
}

export interface ChannelB {
  trace: string; // #hash→#hash format
  confidence: number;
  rejected: string[];
  source_ref: string;
}

export interface PayloadEnd {
  auth_tag: string;
  end_marker: number; // 0xFFFF
  checksum: number;
  message_complete: boolean;
}

export interface KNPv2Packet {
  pre: PreSendHeader;
  channelA: ChannelA;
  channelB: ChannelB;
  end: PayloadEnd;
}

export interface KNPv2Ack {
  packet_id: number;
  status: AckStatus;
  received_checksum: number;
  received_token_count: number;
}

// ── Packet ID generator ──

let _packetCounter = 0;
function nextPacketId(): number {
  return ++_packetCounter + (Date.now() % 1_000_000) * 1_000;
}

// ── Encode ──

export function knpV2Encode(
  source: SubmindEnum,
  target: SubmindEnum | SubmindEnum[],
  channelA: ChannelA,
  channelB: ChannelB,
): KNPv2Packet {
  // Build target bitmask
  const targets = Array.isArray(target) ? target : [target];
  let targetMask = 0;
  for (const t of targets) {
    targetMask |= 1 << t;
  }

  // Serialize payload for checksum
  const aPayload = JSON.stringify(channelA);
  const bPayload = JSON.stringify(channelB);
  const fullPayload = aPayload + bPayload;
  const payloadChecksum = computeCRC16(fullPayload);
  const totalSize = new TextEncoder().encode(fullPayload).byteLength;

  // Auth tag — simulated AES-256-GCM tag (deterministic hash for integrity)
  let tagHash = 0x5A3C;
  for (let i = 0; i < fullPayload.length; i++) {
    tagHash = ((tagHash << 3) ^ fullPayload.charCodeAt(i) ^ (tagHash >> 5)) & 0xFFFFFFFF;
  }
  const authTag = tagHash.toString(16).padStart(8, "0");

  const pre: PreSendHeader = {
    packet_id: nextPacketId(),
    source,
    target: targetMask & 0x3FF, // 10-bit mask
    channel_a_tokens: channelA.functions.length,
    channel_b_tokens: channelB.trace.split("→").length,
    payload_checksum: payloadChecksum,
    total_size: totalSize,
  };

  const end: PayloadEnd = {
    auth_tag: authTag,
    end_marker: 0xFFFF,
    checksum: computeCRC16(fullPayload + authTag),
    message_complete: true,
  };

  return { pre, channelA, channelB, end };
}

// ── Decode ──

export interface KNPv2DecodeResult {
  source: SubmindEnum;
  targets: SubmindEnum[];
  channelA: ChannelA;
  channelB: ChannelB;
  packetId: number;
  verified: boolean;
  errors: string[];
}

export function knpV2Decode(packet: KNPv2Packet): KNPv2DecodeResult {
  const errors: string[] = [];

  // Extract targets from bitmask
  const targets: SubmindEnum[] = [];
  for (let i = 0; i <= 10; i++) {
    if (packet.pre.target & (1 << i)) {
      targets.push(i as SubmindEnum);
    }
  }

  // Verify checksums
  const aPayload = JSON.stringify(packet.channelA);
  const bPayload = JSON.stringify(packet.channelB);
  const fullPayload = aPayload + bPayload;

  const expectedPreChecksum = computeCRC16(fullPayload);
  if (expectedPreChecksum !== packet.pre.payload_checksum) {
    errors.push(`PRE checksum mismatch: expected ${expectedPreChecksum}, got ${packet.pre.payload_checksum}`);
  }

  const expectedEndChecksum = computeCRC16(fullPayload + packet.end.auth_tag);
  if (expectedEndChecksum !== packet.end.checksum) {
    errors.push(`END checksum mismatch: expected ${expectedEndChecksum}, got ${packet.end.checksum}`);
  }

  if (packet.end.end_marker !== 0xFFFF) {
    errors.push(`Invalid end marker: ${packet.end.end_marker}`);
  }

  // Verify token counts
  if (packet.channelA.functions.length !== packet.pre.channel_a_tokens) {
    errors.push(`Channel A token count mismatch: header=${packet.pre.channel_a_tokens}, actual=${packet.channelA.functions.length}`);
  }

  const bTokens = packet.channelB.trace.split("→").length;
  if (bTokens !== packet.pre.channel_b_tokens) {
    errors.push(`Channel B token count mismatch: header=${packet.pre.channel_b_tokens}, actual=${bTokens}`);
  }

  return {
    source: packet.pre.source,
    targets,
    channelA: packet.channelA,
    channelB: packet.channelB,
    packetId: packet.pre.packet_id,
    verified: errors.length === 0,
    errors,
  };
}

// ── ACK ──

export function knpV2Ack(packetId: number, status: AckStatus, packet?: KNPv2Packet): KNPv2Ack {
  let receivedChecksum = 0;
  let receivedTokenCount = 0;

  if (packet) {
    const aPayload = JSON.stringify(packet.channelA);
    const bPayload = JSON.stringify(packet.channelB);
    receivedChecksum = computeCRC16(aPayload + bPayload);
    receivedTokenCount = packet.pre.channel_a_tokens + packet.pre.channel_b_tokens;
  }

  return {
    packet_id: packetId,
    status,
    received_checksum: receivedChecksum,
    received_token_count: receivedTokenCount,
  };
}
