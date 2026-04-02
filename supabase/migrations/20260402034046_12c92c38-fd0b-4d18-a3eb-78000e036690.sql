
-- Knowledge Graph table
CREATE TABLE IF NOT EXISTS public.knowledge_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  industry text,
  audience_segment text,
  platform text,
  messaging_angle text,
  voice_type text,
  timing_pattern text,
  predicted_score float,
  actual_score float,
  delta float,
  confidence float,
  sample_size int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.knowledge_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access knowledge_graph" ON public.knowledge_graph FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Strategy Insights table
CREATE TABLE IF NOT EXISTS public.strategy_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  insight_type text,
  insight_text text,
  supporting_data jsonb DEFAULT '{}'::jsonb,
  confidence float,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.strategy_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access strategy_insights" ON public.strategy_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Creative Log table
CREATE TABLE IF NOT EXISTS public.creative_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  client_id uuid,
  iteration int,
  variants jsonb DEFAULT '[]'::jsonb,
  model_type text,
  voice_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.creative_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access creative_log" ON public.creative_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Competitor Alerts table
CREATE TABLE IF NOT EXISTS public.competitor_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  competitor_name text,
  observed_action text,
  inferred_strategy text,
  client_relevance_score float,
  confidence float,
  recommendation text,
  subjects_to_elevate text[],
  urgency text,
  surfaced_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz
);
ALTER TABLE public.competitor_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access competitor_alerts" ON public.competitor_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
