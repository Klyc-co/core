import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for a private storage asset with short expiry.
 * Use this instead of raw bucket paths when passing media references to AI or external systems.
 */
export async function getSignedAssetUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 300 // 5 minutes
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Generate a unique request ID for AI request signing.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Create a signed AI request payload with request_id and timestamp.
 */
export function signRequest<T extends Record<string, any>>(
  payload: T
): T & { request_id: string; timestamp: string } {
  return {
    ...payload,
    request_id: generateRequestId(),
    timestamp: new Date().toISOString(),
  };
}
