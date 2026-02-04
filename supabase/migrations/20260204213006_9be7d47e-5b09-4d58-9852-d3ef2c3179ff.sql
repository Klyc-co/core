-- Create dropbox_connections table
CREATE TABLE public.dropbox_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id TEXT,
  account_email TEXT,
  account_display_name TEXT,
  root_folder_path TEXT DEFAULT '/',
  auto_sync_enabled BOOLEAN DEFAULT false,
  auto_sync_folder_path TEXT,
  last_sync_at TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create dropbox_assets table
CREATE TABLE public.dropbox_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dropbox_connection_id UUID REFERENCES public.dropbox_connections(id) ON DELETE CASCADE,
  dropbox_file_id TEXT NOT NULL,
  dropbox_path TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT,
  mime_type TEXT,
  file_size BIGINT,
  thumbnail_url TEXT,
  local_storage_path TEXT,
  dropbox_modified_at TIMESTAMPTZ,
  dropbox_created_at TIMESTAMPTZ,
  is_folder BOOLEAN DEFAULT false,
  parent_folder_path TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_dropbox_connections_user_id ON public.dropbox_connections(user_id);
CREATE INDEX idx_dropbox_assets_user_id ON public.dropbox_assets(user_id);
CREATE INDEX idx_dropbox_assets_connection_id ON public.dropbox_assets(dropbox_connection_id);
CREATE INDEX idx_dropbox_assets_dropbox_file_id ON public.dropbox_assets(dropbox_file_id);
CREATE INDEX idx_dropbox_assets_parent_folder ON public.dropbox_assets(parent_folder_path);

-- Enable RLS
ALTER TABLE public.dropbox_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropbox_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for dropbox_connections
CREATE POLICY "Users can view their own Dropbox connections"
  ON public.dropbox_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Dropbox connections"
  ON public.dropbox_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Dropbox connections"
  ON public.dropbox_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Dropbox connections"
  ON public.dropbox_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for dropbox_assets
CREATE POLICY "Users can view their own Dropbox assets"
  ON public.dropbox_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Dropbox assets"
  ON public.dropbox_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Dropbox assets"
  ON public.dropbox_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Dropbox assets"
  ON public.dropbox_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_dropbox_connections_updated_at
  BEFORE UPDATE ON public.dropbox_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dropbox_assets_updated_at
  BEFORE UPDATE ON public.dropbox_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();