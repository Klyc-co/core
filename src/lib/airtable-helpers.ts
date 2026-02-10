import { supabase } from "@/integrations/supabase/client";

// Types for Airtable synced data
export interface AirtableContentRow {
  id: string;
  recordId: string;
  title?: string;
  description?: string;
  status?: string;
  platform?: string;
  publishDate?: string;
  persona?: string;
  campaignTag?: string;
  cta?: string;
  assetUrl?: string;
  hashtags?: string | string[];
  owner?: string;
  notes?: string;
}

export interface AirtablePersonaRow {
  id: string;
  recordId: string;
  name?: string;
  description?: string;
  painPoints?: string;
  goals?: string;
  channels?: string;
}

export interface AirtableCampaignRow {
  id: string;
  recordId: string;
  name?: string;
  objective?: string;
  startDate?: string;
  endDate?: string;
  primaryKpi?: string;
  budget?: string;
  notes?: string;
}

function mapRecord<T>(record: any, extraFields: Record<string, string>): T {
  const mapped = record.mapped_data || {};
  const result: any = {
    id: record.id,
    recordId: record.airtable_record_id,
  };
  for (const [key] of Object.entries(extraFields)) {
    result[key] = mapped[key] ?? undefined;
  }
  // Also copy any mapped_data keys directly
  Object.assign(result, mapped);
  return result as T;
}

export async function getAirtableContentForUser(userId: string): Promise<AirtableContentRow[]> {
  const { data, error } = await supabase
    .from("airtable_synced_records")
    .select("*")
    .eq("user_id", userId)
    .in("table_type", ["content_calendar", "brief"]);

  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, recordId: r.airtable_record_id, ...r.mapped_data }));
}

export async function getAirtablePersonasForUser(userId: string): Promise<AirtablePersonaRow[]> {
  const { data, error } = await supabase
    .from("airtable_synced_records")
    .select("*")
    .eq("user_id", userId)
    .eq("table_type", "persona");

  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, recordId: r.airtable_record_id, ...r.mapped_data }));
}

export async function getAirtableCampaignsForUser(userId: string): Promise<AirtableCampaignRow[]> {
  const { data, error } = await supabase
    .from("airtable_synced_records")
    .select("*")
    .eq("user_id", userId)
    .eq("table_type", "campaign");

  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, recordId: r.airtable_record_id, ...r.mapped_data }));
}

export async function getAirtableSyncSummary(userId: string) {
  const { data: mappings } = await supabase
    .from("airtable_table_mappings")
    .select("table_type, synced_record_count, is_synced")
    .eq("user_id", userId)
    .eq("is_synced", true);

  if (!mappings) return { tableCount: 0, contentRows: 0, personas: 0, campaigns: 0 };

  let contentRows = 0;
  let personas = 0;
  let campaigns = 0;

  for (const m of mappings) {
    const count = (m as any).synced_record_count || 0;
    if (m.table_type === "content_calendar" || m.table_type === "brief") contentRows += count;
    else if (m.table_type === "persona") personas += count;
    else if (m.table_type === "campaign") campaigns += count;
  }

  return { tableCount: mappings.length, contentRows, personas, campaigns };
}
