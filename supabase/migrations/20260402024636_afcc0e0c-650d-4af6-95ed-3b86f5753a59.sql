
CREATE TABLE public.campaign_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaign_drafts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checkpoint_label text NOT NULL,
  checkpoint_time timestamptz NOT NULL DEFAULT now(),
  actual_viral_score float,
  predicted_viral_score float,
  raw_metrics jsonb DEFAULT '{}'::jsonb,
  threshold_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkpoints" ON public.campaign_checkpoints
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checkpoints" ON public.campaign_checkpoints
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('analytics-reports', 'analytics-reports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload analytics reports" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'analytics-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read analytics reports" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'analytics-reports');
