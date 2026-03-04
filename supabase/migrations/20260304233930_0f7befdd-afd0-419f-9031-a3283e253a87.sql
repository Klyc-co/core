
-- Add new columns to campaign_performance
ALTER TABLE public.campaign_performance
  ADD COLUMN IF NOT EXISTS post_length integer,
  ADD COLUMN IF NOT EXISTS post_theme text,
  ADD COLUMN IF NOT EXISTS cta_type text,
  ADD COLUMN IF NOT EXISTS publish_time timestamptz,
  ADD COLUMN IF NOT EXISTS experiment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS engagement_accuracy numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr_accuracy numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_accuracy numeric DEFAULT 0;

-- Create learning_patterns table
CREATE TABLE IF NOT EXISTS public.learning_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  pattern_type text NOT NULL,
  pattern_value text NOT NULL,
  confidence_score numeric DEFAULT 0,
  supporting_campaigns integer DEFAULT 0,
  discovered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_learning_patterns_client ON public.learning_patterns(client_id);
CREATE INDEX idx_learning_patterns_type ON public.learning_patterns(pattern_type);

CREATE POLICY "Users can view their own learning patterns"
  ON public.learning_patterns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = learning_patterns.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = learning_patterns.client_id
  ));

CREATE POLICY "Users can insert their own learning patterns"
  ON public.learning_patterns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = learning_patterns.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = learning_patterns.client_id
  ));

CREATE POLICY "Users can delete their own learning patterns"
  ON public.learning_patterns FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = learning_patterns.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = learning_patterns.client_id
  ));

-- Create strategy_updates table
CREATE TABLE IF NOT EXISTS public.strategy_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  old_strategy jsonb DEFAULT '{}'::jsonb,
  new_strategy jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric DEFAULT 0,
  approved boolean DEFAULT false,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.strategy_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_strategy_updates_client ON public.strategy_updates(client_id);

CREATE POLICY "Users can view their own strategy updates"
  ON public.strategy_updates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = strategy_updates.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = strategy_updates.client_id
  ));

CREATE POLICY "Users can insert their own strategy updates"
  ON public.strategy_updates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = strategy_updates.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = strategy_updates.client_id
  ));

CREATE POLICY "Users can update their own strategy updates"
  ON public.strategy_updates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = strategy_updates.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = strategy_updates.client_id
  ));

-- Create learning_experiments table
CREATE TABLE IF NOT EXISTS public.learning_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  experiment_type text NOT NULL,
  hypothesis text,
  posts_tested integer DEFAULT 0,
  status text DEFAULT 'pending',
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.learning_experiments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_learning_experiments_client ON public.learning_experiments(client_id);

CREATE POLICY "Users can view their own experiments"
  ON public.learning_experiments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = learning_experiments.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = learning_experiments.client_id
  ));

CREATE POLICY "Users can insert their own experiments"
  ON public.learning_experiments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = learning_experiments.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = learning_experiments.client_id
  ));

CREATE POLICY "Users can update their own experiments"
  ON public.learning_experiments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts cd WHERE cd.user_id = auth.uid() AND cd.client_id = learning_experiments.client_id
  ) OR EXISTS (
    SELECT 1 FROM post_queue pq WHERE pq.user_id = auth.uid() AND pq.client_id = learning_experiments.client_id
  ));
