import { supabase } from "@/integrations/supabase/client";
import { saveBrainDocument } from "@/lib/clientBrain";

/**
 * Auto-populate client_profiles and client_brain from AI draft_updates
 * during onboarding interview.
 */
export async function autoPopulateFromDraftUpdates(
  draftUpdates: Record<string, any>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const clientId = user.id;

  // Build client_profiles upsert from recognized fields
  const profileFields: Record<string, any> = {};
  const fieldMap: Record<string, string> = {
    business_name: "business_name",
    company_name: "business_name",
    description: "description",
    company_description: "description",
    industry: "industry",
    target_audience: "target_audience",
    value_proposition: "value_proposition",
    website: "website",
    product_category: "product_category",
    geography_markets: "geography_markets",
    marketing_goals: "marketing_goals",
    main_competitors: "main_competitors",
  };

  for (const [key, dbCol] of Object.entries(fieldMap)) {
    if (draftUpdates[key] !== undefined) {
      profileFields[dbCol] = draftUpdates[key];
    }
  }

  // Upsert client_profiles if we have data
  if (Object.keys(profileFields).length > 0) {
    const { error } = await supabase
      .from("client_profiles")
      .upsert(
        { user_id: clientId, ...profileFields },
        { onConflict: "user_id" }
      );
    if (error) console.error("Failed to upsert client_profiles:", error);
  }

  // Upsert brain documents from recognized nested structures
  const promises: Promise<boolean>[] = [];

  if (draftUpdates.brand_profile || draftUpdates.company_description || draftUpdates.positioning) {
    promises.push(
      saveBrainDocument(clientId, "brand_profile", {
        companyDescription: draftUpdates.company_description || draftUpdates.brand_profile?.companyDescription,
        productCategories: draftUpdates.product_categories
          ? (Array.isArray(draftUpdates.product_categories) ? draftUpdates.product_categories : draftUpdates.product_categories.split(",").map((s: string) => s.trim()))
          : undefined,
        positioning: draftUpdates.positioning || draftUpdates.brand_profile?.positioning,
      })
    );
  }

  if (draftUpdates.voice_profile || draftUpdates.tone || draftUpdates.writing_style) {
    promises.push(
      saveBrainDocument(clientId, "voice_profile", {
        tone: draftUpdates.tone || draftUpdates.voice_profile?.tone,
        writingStyle: draftUpdates.writing_style || draftUpdates.voice_profile?.writingStyle,
        emojiUsage: draftUpdates.emoji_usage || draftUpdates.voice_profile?.emojiUsage,
      })
    );
  }

  if (draftUpdates.strategy_profile || draftUpdates.messaging_pillars || draftUpdates.target_audience) {
    promises.push(
      saveBrainDocument(clientId, "strategy_profile", {
        messagingPillars: draftUpdates.messaging_pillars
          ? (Array.isArray(draftUpdates.messaging_pillars) ? draftUpdates.messaging_pillars : draftUpdates.messaging_pillars.split(",").map((s: string) => s.trim()))
          : undefined,
        targetAudience: draftUpdates.target_audience || draftUpdates.strategy_profile?.targetAudience,
      })
    );
  }

  await Promise.all(promises);
}

/**
 * Save onboarding transcript to the database.
 */
export async function saveOnboardingTranscript(
  transcript: string,
  clientId?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("onboarding_transcripts" as any).insert({
    user_id: user.id,
    client_id: clientId || user.id,
    transcript,
  } as any);
}
