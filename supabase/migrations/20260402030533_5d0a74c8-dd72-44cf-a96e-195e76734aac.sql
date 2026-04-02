
CREATE TABLE public.viral_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  iteration_round integer NOT NULL DEFAULT 1,
  loop_status text,
  variant_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_card jsonb,
  top_score double precision,
  avg_score double precision,
  variants_accepted integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.viral_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on viral_log"
  ON public.viral_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view viral_log by client_id"
  ON public.viral_log
  FOR SELECT
  TO authenticated
  USING (true);
