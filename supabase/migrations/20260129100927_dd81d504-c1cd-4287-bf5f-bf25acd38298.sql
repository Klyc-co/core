-- Create table for Google Drive connections via Zapier
CREATE TABLE public.google_drive_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id TEXT NOT NULL,
  folder_url TEXT,
  assets_sheet_id TEXT,
  assets_sheet_url TEXT,
  brand_guidelines_sheet_id TEXT,
  brand_guidelines_sheet_url TEXT,
  zapier_webhook_url TEXT,
  connection_status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own connections
CREATE POLICY "Users can view their own drive connections"
ON public.google_drive_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drive connections"
ON public.google_drive_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive connections"
ON public.google_drive_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive connections"
ON public.google_drive_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Marketers can view connected client drive data
CREATE POLICY "Marketers can view client drive connections"
ON public.google_drive_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM marketer_clients
    WHERE marketer_clients.marketer_id = auth.uid()
    AND marketer_clients.client_id = google_drive_connections.user_id
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_google_drive_connections_updated_at
BEFORE UPDATE ON public.google_drive_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for synced assets from Google Drive
CREATE TABLE public.google_drive_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  drive_connection_id UUID REFERENCES public.google_drive_connections(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT,
  drive_file_id TEXT,
  drive_url TEXT,
  description TEXT,
  tags TEXT[],
  content_extracted TEXT,
  is_priority BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_assets ENABLE ROW LEVEL SECURITY;

-- Users can manage their own assets
CREATE POLICY "Users can view their own drive assets"
ON public.google_drive_assets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drive assets"
ON public.google_drive_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive assets"
ON public.google_drive_assets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive assets"
ON public.google_drive_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Marketers can view client assets
CREATE POLICY "Marketers can view client drive assets"
ON public.google_drive_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM marketer_clients
    WHERE marketer_clients.marketer_id = auth.uid()
    AND marketer_clients.client_id = google_drive_assets.user_id
  )
);