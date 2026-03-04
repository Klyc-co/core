import { supabase } from "@/integrations/supabase/client";

/**
 * Upsert a campaign draft from voice interview draft_updates.
 * Returns the draft ID.
 */
export async function upsertCampaignDraftFromInterview(
  campaignDraft: Record<string, any>,
  existingDraftId?: string,
  clientId?: string
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Map interview fields to campaign_drafts columns
  const draftRow: Record<string, any> = {
    user_id: user.id,
    client_id: clientId || null,
  };

  if (campaignDraft.campaign_name) draftRow.campaign_idea = campaignDraft.campaign_name;
  if (campaignDraft.goal) draftRow.campaign_objective = campaignDraft.goal;
  if (campaignDraft.theme) draftRow.campaign_goals = campaignDraft.theme;
  if (campaignDraft.cta) draftRow.post_caption = campaignDraft.cta;
  if (campaignDraft.audience_segment) draftRow.target_audience = campaignDraft.audience_segment;
  if (campaignDraft.target_audience_description) draftRow.target_audience_description = campaignDraft.target_audience_description;
  if (campaignDraft.product_focus) draftRow.prompt = campaignDraft.product_focus;

  // Store platforms and frequency in tags
  const tags: string[] = [];
  if (campaignDraft.platforms) {
    const platforms = Array.isArray(campaignDraft.platforms)
      ? campaignDraft.platforms
      : String(campaignDraft.platforms).split(",").map((s: string) => s.trim());
    tags.push(...platforms);
  }
  if (campaignDraft.duration_days) tags.push(`duration:${campaignDraft.duration_days}d`);
  if (campaignDraft.posts_per_week) tags.push(`frequency:${campaignDraft.posts_per_week}/wk`);
  if (tags.length > 0) draftRow.tags = tags;

  try {
    if (existingDraftId) {
      const { error } = await supabase
        .from("campaign_drafts")
        .update(draftRow)
        .eq("id", existingDraftId);
      if (error) {
        console.error("Failed to update campaign draft:", error);
        return existingDraftId;
      }
      return existingDraftId;
    } else {
      const { data, error } = await supabase
        .from("campaign_drafts")
        .insert(draftRow as any)
        .select("id")
        .single();
      if (error) {
        console.error("Failed to create campaign draft:", error);
        return null;
      }
      return data?.id || null;
    }
  } catch (e) {
    console.error("Campaign draft upsert error:", e);
    return null;
  }
}

/**
 * Save campaign interview transcript to database.
 */
export async function saveCampaignInterviewTranscript(
  transcript: string,
  campaignDraftId?: string,
  clientId?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("campaign_interview_transcripts" as any).insert({
    user_id: user.id,
    client_id: clientId || null,
    campaign_draft_id: campaignDraftId || null,
    transcript,
  } as any);
}
