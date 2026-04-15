CREATE TABLE public.ai_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT,
  model_used TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  client_id TEXT,
  metadata JSONB
);

ALTER TABLE public.ai_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_activity_log"
ON public.ai_activity_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert ai_activity_log"
ON public.ai_activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);