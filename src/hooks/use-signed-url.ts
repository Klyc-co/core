import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a Supabase public URL
 * e.g., https://xxx.supabase.co/storage/v1/object/public/videos/path/to/file.mp4
 * returns: path/to/file.mp4
 */
const extractStoragePath = (url: string, bucket: string): string | null => {
  if (!url) return null;
  
  // Handle public URL format
  const publicPattern = `/storage/v1/object/public/${bucket}/`;
  const publicIndex = url.indexOf(publicPattern);
  if (publicIndex !== -1) {
    return url.substring(publicIndex + publicPattern.length);
  }
  
  // Handle signed URL format (already signed, return as-is)
  if (url.includes('/storage/v1/object/sign/')) {
    return null; // Already a signed URL
  }
  
  // If it's just a path, return it
  if (!url.startsWith('http')) {
    return url;
  }
  
  return null;
};

/**
 * Hook to get a signed URL for a storage object
 * Returns the signed URL or the original URL if signing fails
 */
export const useSignedUrl = (
  publicUrl: string | null | undefined,
  bucket: string = "videos",
  expiresIn: number = 3600 // 1 hour default
) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const path = extractStoragePath(publicUrl, bucket);
        
        if (!path) {
          // Already signed or can't extract path, use original
          setSignedUrl(publicUrl);
          return;
        }

        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (signError) {
          console.error("Failed to create signed URL:", signError);
          setError(signError.message);
          // Fallback to original URL
          setSignedUrl(publicUrl);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Error getting signed URL:", err);
        setSignedUrl(publicUrl); // Fallback
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [publicUrl, bucket, expiresIn]);

  return { signedUrl, loading, error };
};

/**
 * Utility function to get a signed URL (non-hook version for one-time use)
 */
export const getSignedUrl = async (
  publicUrl: string,
  bucket: string = "videos",
  expiresIn: number = 3600
): Promise<string> => {
  const path = extractStoragePath(publicUrl, bucket);
  
  if (!path) {
    return publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return publicUrl;
  }

  return data.signedUrl;
};
