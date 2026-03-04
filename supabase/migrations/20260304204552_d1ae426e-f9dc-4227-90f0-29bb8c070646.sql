
CREATE TABLE public.campaign_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaign_drafts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  platform text NOT NULL,
  post_id uuid REFERENCES public.post_queue(id) ON DELETE CASCADE,
  predicted_engagement numeric DEFAULT 0,
  actual_engagement numeric DEFAULT 0,
  predicted_ctr numeric DEFAULT 0,
  actual_ctr numeric DEFAULT 0,
  predicted_conversion numeric DEFAULT 0,
  actual_conversion numeric DEFAULT 0,
  performance_score numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_performance_campaign_id ON public.campaign_performance(campaign_id);
CREATE INDEX idx_campaign_performance_client_id ON public.campaign_performance(client_id);
CREATE INDEX idx_campaign_performance_platform ON public.campaign_performance(platform);

ALTER TABLE public.campaign_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign performance"
  ON public.campaign_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.post_queue pq
      WHERE pq.id = campaign_performance.post_id AND pq.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.campaign_drafts cd
      WHERE cd.id = campaign_performance.campaign_id AND cd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own campaign performance"
  ON public.campaign_performance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_drafts cd
      WHERE cd.id = campaign_performance.campaign_id AND cd.user_id = auth.uid()
    )
  );
