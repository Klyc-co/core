-- Platform connections table
CREATE TABLE public.client_platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  platform TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform)
);

ALTER TABLE public.client_platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON public.client_platform_connections FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can create own connections"
  ON public.client_platform_connections FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own connections"
  ON public.client_platform_connections FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Users can delete own connections"
  ON public.client_platform_connections FOR DELETE
  USING (auth.uid() = client_id);

CREATE TRIGGER update_client_platform_connections_updated_at
  BEFORE UPDATE ON public.client_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scheduled posts table
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  platform TEXT NOT NULL,
  content_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can create own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Users can delete own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = client_id);