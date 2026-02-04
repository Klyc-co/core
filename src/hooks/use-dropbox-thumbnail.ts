import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const thumbnailCache = new Map<string, string>();

export const useDropboxThumbnail = (
  path: string | null,
  isImage: boolean
) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path || !isImage) {
      setThumbnailUrl(null);
      return;
    }

    // Check cache first
    if (thumbnailCache.has(path)) {
      setThumbnailUrl(thumbnailCache.get(path)!);
      return;
    }

    const fetchThumbnail = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: funcError } = await supabase.functions.invoke(
          "dropbox-get-thumbnail",
          { body: { path } }
        );

        if (funcError) {
          throw new Error(funcError.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.url) {
          thumbnailCache.set(path, data.url);
          setThumbnailUrl(data.url);
        }
      } catch (err) {
        console.error("Failed to fetch thumbnail:", err);
        setError(err instanceof Error ? err.message : "Failed to load thumbnail");
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnail();
  }, [path, isImage]);

  return { thumbnailUrl, loading, error };
};

// Batch fetch thumbnails for multiple files
export const fetchDropboxThumbnails = async (
  paths: string[]
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  const uncachedPaths = paths.filter((p) => !thumbnailCache.has(p));

  // Return cached results for already fetched paths
  paths.forEach((path) => {
    if (thumbnailCache.has(path)) {
      results.set(path, thumbnailCache.get(path)!);
    }
  });

  // Fetch uncached thumbnails in parallel (limit concurrency)
  const batchSize = 5;
  for (let i = 0; i < uncachedPaths.length; i += batchSize) {
    const batch = uncachedPaths.slice(i, i + batchSize);
    const promises = batch.map(async (path) => {
      try {
        const { data } = await supabase.functions.invoke("dropbox-get-thumbnail", {
          body: { path },
        });
        if (data?.url) {
          thumbnailCache.set(path, data.url);
          results.set(path, data.url);
        }
      } catch (err) {
        console.error(`Failed to fetch thumbnail for ${path}:`, err);
      }
    });
    await Promise.all(promises);
  }

  return results;
};
