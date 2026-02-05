import { supabase } from "@/integrations/supabase/client";

const BRAND_ASSETS_BUCKET = "brand-assets";

const sanitizeFilename = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);

const getFileExt = (filename: string) => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/**
 * Uploads a user-provided image to the public brand-assets bucket and returns its public URL.
 */
export async function uploadBrandAssetImage(params: {
  userId: string;
  file: File;
  folder?: string; // e.g. "products/{productId}"
}): Promise<{ publicUrl: string; path: string }>
{
  const { userId, file, folder } = params;

  const safeName = sanitizeFilename(file.name || "upload");
  const ext = getFileExt(safeName);
  const baseName = ext ? safeName.slice(0, -(ext.length + 1)) : safeName;
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  const finalName = `${baseName || "image"}-${unique}${ext ? `.${ext}` : ""}`;
  const prefix = folder ? `${userId}/${folder}` : `${userId}`;
  const path = `${prefix}/${finalName}`;

  const { error: uploadError } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(BRAND_ASSETS_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
