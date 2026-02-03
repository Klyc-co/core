/**
 * Token Encryption Utility
 * 
 * Provides application-layer encryption for sensitive OAuth tokens
 * stored in the social_connections table.
 * 
 * Uses AES-256-GCM for authenticated encryption.
 */

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Import the encryption key
async function importKey(): Promise<CryptoKey | null> {
  const keyHex = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!keyHex || keyHex.length !== 64) {
    // Key should be 32 bytes (64 hex chars) for AES-256
    console.warn("TOKEN_ENCRYPTION_KEY not configured or invalid - tokens will be stored unencrypted");
    return null;
  }

  try {
    const keyBytes = hexToBytes(keyHex);
    return await crypto.subtle.importKey(
      "raw",
      keyBytes.buffer as ArrayBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Failed to import encryption key:", error);
    return null;
  }
}

/**
 * Encrypts a token using AES-256-GCM
 * 
 * Format: ENC:v1:<iv_hex>:<ciphertext_hex>
 * 
 * If encryption is not configured, returns the token as-is.
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await importKey();
  if (!key) {
    // No encryption configured - return as-is
    return plaintext;
  }

  try {
    // Generate a random 12-byte IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encode the plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Encrypt using AES-256-GCM
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      data
    );
    
    // The ciphertext includes the auth tag (last 16 bytes)
    const ciphertextBytes = new Uint8Array(ciphertext);
    
    // Format: ENC:v1:<iv>:<ciphertext+tag>
    return `ENC:v1:${bytesToHex(iv)}:${bytesToHex(ciphertextBytes)}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    // On encryption failure, return plaintext (with warning logged)
    return plaintext;
  }
}

/**
 * Decrypts a token that was encrypted with encryptToken
 * 
 * If the token doesn't start with "ENC:", assumes it's plaintext and returns as-is.
 * This provides backwards compatibility with existing unencrypted tokens.
 */
export async function decryptToken(ciphertext: string): Promise<string> {
  // Check if this is an encrypted token
  if (!ciphertext.startsWith("ENC:")) {
    // Legacy unencrypted token - return as-is
    return ciphertext;
  }

  const key = await importKey();
  if (!key) {
    console.error("Cannot decrypt token - TOKEN_ENCRYPTION_KEY not configured");
    throw new Error("Token decryption not available - encryption key not configured");
  }

  try {
    // Parse the encrypted format: ENC:v1:<iv>:<ciphertext+tag>
    const parts = ciphertext.split(":");
    if (parts.length !== 4 || parts[1] !== "v1") {
      throw new Error("Invalid encrypted token format");
    }

    const iv = hexToBytes(parts[2]);
    const data = hexToBytes(parts[3]);

    // Decrypt using AES-256-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      data.buffer as ArrayBuffer
    );

    // Decode the plaintext
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Generates a new encryption key for TOKEN_ENCRYPTION_KEY
 * 
 * This should be run once to generate a key, then stored securely.
 * Call this function to get a new key to configure as a secret.
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(key);
}
