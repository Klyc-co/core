CREATE TABLE public.image_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  user_id uuid NOT NULL,
  campaign_id uuid,
  original_url text NOT NULL,
  status text DEFAULT 'pending',
  rejection_reason text,
  platform_specs jsonb DEFAULT '{}'::jsonb,
  use_context text,
  reviewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own image assets" ON public.image_assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role image assets" ON public.image_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.image_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  user_id uuid NOT NULL,
  source text DEFAULT 'user_upload',
  image_url text NOT NULL,
  status text DEFAULT 'pending',
  queued_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.image_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own image queue" ON public.image_queue FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role image queue" ON public.image_queue FOR ALL TO service_role USING (true) WITH CHECK (true);