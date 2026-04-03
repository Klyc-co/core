
-- ═══════════════════════════════════════════════════════════
-- TABLE 1: orchestrator_sessions — ALTER existing
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.orchestrator_sessions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subminds_called TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ═══════════════════════════════════════════════════════════
-- TABLE 2: client_brain — ALTER existing
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.client_brain
  ADD COLUMN IF NOT EXISTS brand_voice JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience_segments JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moat_profile JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS strategy_profile_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS competitor_list TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS market_sophistication TEXT DEFAULT 'intermediate';

-- ═══════════════════════════════════════════════════════════
-- TABLE 3: solo_mode_logs — ALTER existing
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.solo_mode_logs
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS permission_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS permission_scope TEXT,
  ADD COLUMN IF NOT EXISTS decision_chain JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS subminds_invoked TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS outcome JSONB DEFAULT '{}';

-- Add update policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'solo_mode_logs' AND policyname = 'Users can update own solo logs'
  ) THEN
    CREATE POLICY "Users can update own solo logs"
      ON public.solo_mode_logs FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- TABLE 4: campaign_memory — ALTER existing
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.campaign_memory
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS brief JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subminds_used TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS predicted_score NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_metrics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS messaging_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '[]';

-- ═══════════════════════════════════════════════════════════
-- TABLE 5: competitor_observations — ALTER existing
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.competitor_observations
  ADD COLUMN IF NOT EXISTS observation_type TEXT DEFAULT 'campaign',
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS client_relevance NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS source_urls TEXT[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════
-- TABLE 6: personality_settings (NEW)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.personality_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tone TEXT NOT NULL DEFAULT 'professional'
    CHECK (tone IN ('professional', 'casual', 'direct', 'encouraging', 'technical')),
  verbosity TEXT NOT NULL DEFAULT 'standard'
    CHECK (verbosity IN ('brief', 'standard', 'detailed')),
  explanation_detail INTEGER NOT NULL DEFAULT 5 CHECK (explanation_detail >= 0 AND explanation_detail <= 10),
  default_mode TEXT NOT NULL DEFAULT 'guided'
    CHECK (default_mode IN ('guided', 'hybrid', 'solo')),
  confidence_threshold INTEGER NOT NULL DEFAULT 60 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  approval_rule TEXT NOT NULL DEFAULT 'ask_big_decisions'
    CHECK (approval_rule IN ('always_ask', 'ask_publishing', 'ask_big_decisions', 'never_ask')),
  industry TEXT[] DEFAULT '{}',
  competitor_tracking BOOLEAN NOT NULL DEFAULT false,
  alert_style TEXT NOT NULL DEFAULT 'chat_bubble'
    CHECK (alert_style IN ('chat_bubble', 'banner', 'email_digest', 'quiet', 'off')),
  checkin_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (checkin_frequency IN ('never', 'weekly', 'daily', 'realtime')),
  proactive_suggestions BOOLEAN NOT NULL DEFAULT true,
  show_reasoning INTEGER NOT NULL DEFAULT 6 CHECK (show_reasoning >= 0 AND show_reasoning <= 10),
  adaptation_level TEXT NOT NULL DEFAULT 'standard'
    CHECK (adaptation_level IN ('off', 'light', 'standard', 'aggressive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personality_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personality settings"
  ON public.personality_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own personality settings"
  ON public.personality_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personality settings"
  ON public.personality_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personality settings"
  ON public.personality_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_personality_settings_updated_at
  BEFORE UPDATE ON public.personality_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- TABLE 7: approval_history — ALTER existing
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.approval_history
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewer TEXT DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS review_criteria JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revision_notes TEXT,
  ADD COLUMN IF NOT EXISTS iteration_number INTEGER DEFAULT 1;
