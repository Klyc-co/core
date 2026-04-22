/**
 * Orchestrated image generation — routes through klyc-orchestrator
 * so the full AI pipeline runs: research → strategy → copy → image → performance.
 *
 * This module replaces the direct generate-image call in ImageVideoGenerator.
 * Import and call generateImageViaOrchestrator() instead of invoking generate-image directly.
 */

import { supabase } from "@/integrations/supabase/client";

// Map output size to platform hint for the orchestrator
const SIZE_TO_PLATFORM: Record<string, string> = {
  portrait: "tiktok,instagram",
  square: "instagram,facebook",
  landscape: "linkedin,youtube",
};

/**
 * Extract the best image URL from any response shape:
 *   - Orchestrator: { σo: { a_lane_envelopes: { image: { σo: "url" | { imageUrl } } } } }
 *   - Orchestrator flat: { σo: { final_products: { image: { σo: "url" } } } }
 *   - Direct single: { imageUrl: "..." }
 *   - Composite: { batch_detail: [{ url }], σo: { platform: "url" } }
 *   - Legacy: { url }, { image }, { image_url }
 */
export function extractImageUrl(data: any): string | null {
  if (!data) return null;

  // --- Orchestrator envelope: dig into σo.a_lane_envelopes.image ---
  const sigmaO = data["\u03c3o"];
  if (sigmaO && typeof sigmaO === "object") {
    // Try a_lane_envelopes.image first
    const laneEnvelopes = sigmaO.a_lane_envelopes || sigmaO.final_products;
    if (laneEnvelopes?.image) {
      const imageLane = laneEnvelopes.image;
      // The image lane response itself could be a generate-image response
      const innerUrl = extractFromImageLane(imageLane);
      if (innerUrl) return innerUrl;
    }

    // σo might be a direct URL string
    if (typeof sigmaO === "string" && sigmaO.startsWith("http")) return sigmaO;

    // σo might be a map of platform → URL
    const urls = Object.values(sigmaO).filter(
      (v) => typeof v === "string" && (v as string).startsWith("http")
    );
    if (urls.length > 0) return urls[0] as string;
  }

  // --- Direct generate-image response shapes ---
  if (data.imageUrl) return data.imageUrl;
  if (data.batch_detail && Array.isArray(data.batch_detail) && data.batch_detail.length > 0) {
    const first = data.batch_detail.find((d: any) => d.url);
    if (first?.url) return first.url;
  }
  if (data.url) return data.url;
  if (data.image) return data.image;
  if (data.image_url) return data.image_url;

  return null;
}

/** Extract URL from an image lane result (nested inside orchestrator) */
function extractFromImageLane(lane: any): string | null {
  if (!lane) return null;

  // lane.σo could be the image URL or an object with imageUrl
  const innerSigma = lane["\u03c3o"];
  if (typeof innerSigma === "string" && innerSigma.startsWith("http")) return innerSigma;
  if (innerSigma && typeof innerSigma === "object") {
    if (innerSigma.imageUrl) return innerSigma.imageUrl;
    // Batch detail inside the lane
    if (innerSigma.batch_detail && Array.isArray(innerSigma.batch_detail)) {
      const first = innerSigma.batch_detail.find((d: any) => d.url);
      if (first?.url) return first.url;
    }
    // σo map of platform → URL
    const urls = Object.values(innerSigma).filter(
      (v) => typeof v === "string" && (v as string).startsWith("http")
    );
    if (urls.length > 0) return urls[0] as string;
  }

  // Direct fields on the lane object
  if (lane.imageUrl) return lane.imageUrl;
  if (lane.url) return lane.url;
  if (lane.image_url) return lane.image_url;
  if (lane.success && lane.batch_detail) {
    const first = lane.batch_detail.find((d: any) => d.url);
    if (first?.url) return first.url;
  }

  return null;
}

export interface OrchestratedImageResult {
  imageUrl: string | null;
  fullResponse: any;
  error: string | null;
  pipelineRan: boolean;
  lanesCompleted: string[];
}

/**
 * Generate an image through the full AI orchestrator pipeline.
 * Routes: klyc-orchestrator → research → strategy → copy → image → performance
 */
export async function generateImageViaOrchestrator(
  prompt: string,
  outputSize: string,
  model: string = "nano-banana",
): Promise<OrchestratedImageResult> {
  // Build KNP envelope for the orchestrator
  const platforms = SIZE_TO_PLATFORM[outputSize] || "instagram";
  const envelope = {
    // KNP slots
    "\u03beb": prompt,        // ξb = brief
    brief: prompt,            // fallback
    prompt: prompt,           // double fallback
    "\u03b6q": "image_generation", // ζq = use context
    "\u03bcp": platforms,     // μp = platforms
    platforms: platforms.split(","),
    "\u03b8c": model === "nano-banana" ? "IMG:001" : "IMG:003", // θc = style code
    intent: "campaign_complete",
    meta: {
      intent: "campaign_complete",
      source: "creative-studio",
      platforms: platforms.split(","),
    },
  };

  try {
    const { data, error } = await supabase.functions.invoke("klyc-orchestrator", {
      body: envelope,
    });

    if (error) {
      return {
        imageUrl: null,
        fullResponse: data,
        error: error.message || "Orchestrator call failed",
        pipelineRan: false,
        lanesCompleted: [],
      };
    }

    // Extract lanes that completed
    const sigmaO = data?.["\u03c3o"];
    const laneEnvelopes = sigmaO?.a_lane_envelopes || sigmaO?.final_products || {};
    const lanesCompleted = Object.keys(laneEnvelopes);

    // Extract image URL from the full response
    const imageUrl = extractImageUrl(data);

    return {
      imageUrl,
      fullResponse: data,
      error: imageUrl ? null : "No image URL found in orchestrator response",
      pipelineRan: true,
      lanesCompleted,
    };
  } catch (err: any) {
    return {
      imageUrl: null,
      fullResponse: null,
      error: err.message || "Orchestrator failed",
      pipelineRan: false,
      lanesCompleted: [],
    };
  }
}
