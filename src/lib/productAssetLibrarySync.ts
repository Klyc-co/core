import { supabase } from "@/integrations/supabase/client";

export async function syncProductImagesToLibrary(params: {
  userId: string;
  productId: string;
  productName: string;
  assets: Array<{ name: string; url: string; source: string }>; // url must be durable (not blob:)
}) {
  const { userId, productId, productName, assets } = params;

  const durableAssets = assets.filter((a) => a.url && !a.url.startsWith("blob:"));
  if (durableAssets.length === 0) return;

  // Dedupe against existing library entries for this product
  const { data: existing } = await supabase
    .from("brand_assets")
    .select("id, value")
    .eq("user_id", userId)
    .eq("asset_type", "image")
    // JSON containment match (metadata @> {product_id: ...})
    .contains("metadata" as any, { source: "product", product_id: productId } as any);

  const existingValues = new Set((existing || []).map((e: any) => e.value));

  const rows = durableAssets
    .filter((a) => !existingValues.has(a.url))
    .map((asset) => ({
      user_id: userId,
      asset_type: "image",
      name: `${productName} - ${asset.name}`,
      value: asset.url,
      metadata: {
        source: "product",
        product_id: productId,
        product_name: productName,
        original_source: asset.source,
      },
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("brand_assets").insert(rows);
  if (error) throw error;
}
