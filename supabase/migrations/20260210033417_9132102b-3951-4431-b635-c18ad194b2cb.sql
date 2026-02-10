
-- Airtable connections table
CREATE TABLE public.airtable_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_token TEXT NOT NULL,
  display_name TEXT DEFAULT 'Airtable',
  connection_status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  sync_frequency TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.airtable_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own airtable connections" ON public.airtable_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own airtable connections" ON public.airtable_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own airtable connections" ON public.airtable_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own airtable connections" ON public.airtable_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_airtable_connections_updated_at
  BEFORE UPDATE ON public.airtable_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Airtable table mappings
CREATE TABLE public.airtable_table_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.airtable_connections(id) ON DELETE CASCADE,
  airtable_base_id TEXT NOT NULL,
  airtable_base_name TEXT,
  airtable_table_id TEXT NOT NULL,
  airtable_table_name TEXT,
  table_type TEXT NOT NULL DEFAULT 'other',
  column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_synced BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  synced_record_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, airtable_base_id, airtable_table_id)
);

ALTER TABLE public.airtable_table_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own airtable mappings" ON public.airtable_table_mappings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own airtable mappings" ON public.airtable_table_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own airtable mappings" ON public.airtable_table_mappings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own airtable mappings" ON public.airtable_table_mappings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_airtable_table_mappings_updated_at
  BEFORE UPDATE ON public.airtable_table_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Airtable synced records
CREATE TABLE public.airtable_synced_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mapping_id UUID NOT NULL REFERENCES public.airtable_table_mappings(id) ON DELETE CASCADE,
  airtable_base_id TEXT NOT NULL,
  airtable_table_id TEXT NOT NULL,
  airtable_record_id TEXT NOT NULL,
  table_type TEXT NOT NULL,
  mapped_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_record JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, airtable_base_id, airtable_table_id, airtable_record_id)
);

ALTER TABLE public.airtable_synced_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own airtable records" ON public.airtable_synced_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own airtable records" ON public.airtable_synced_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own airtable records" ON public.airtable_synced_records
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own airtable records" ON public.airtable_synced_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_airtable_synced_records_updated_at
  BEFORE UPDATE ON public.airtable_synced_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_airtable_synced_records_type ON public.airtable_synced_records(user_id, table_type);
CREATE INDEX idx_airtable_synced_records_mapping ON public.airtable_synced_records(mapping_id);
