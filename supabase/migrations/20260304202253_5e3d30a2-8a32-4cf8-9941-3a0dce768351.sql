
CREATE TABLE public.ai_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  intent TEXT,
  token_count_estimate INTEGER,
  campaign_id UUID,
  client_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ai_requests_request_id_unique UNIQUE (request_id)
);

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI requests"
  ON public.ai_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No client-side INSERT/UPDATE/DELETE — only service role writes
CREATE POLICY "Service role inserts only"
  ON public.ai_requests FOR INSERT
  TO authenticated
  WITH CHECK (false);
