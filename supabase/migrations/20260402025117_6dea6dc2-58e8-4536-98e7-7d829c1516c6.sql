
CREATE TABLE public.competitor_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  competitor_name text,
  observed_action text,
  platform text,
  engagement_delta float,
  observed_at timestamptz DEFAULT now(),
  knp_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitor observations" ON public.competitor_observations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own competitor observations" ON public.competitor_observations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.campaign_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  campaign_name text,
  industry text,
  audience text,
  platform text,
  message_summary text,
  viral_score float,
  engagement_score float,
  conversion_rate float,
  launched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign memory" ON public.campaign_memory
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own campaign memory" ON public.campaign_memory
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.research_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  campaign_id uuid,
  finding_type text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  knp_payload text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.research_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research feed" ON public.research_feed
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own research feed" ON public.research_feed
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
