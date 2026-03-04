
CREATE TABLE public.onboarding_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  transcript TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own transcripts"
  ON public.onboarding_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own transcripts"
  ON public.onboarding_transcripts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts"
  ON public.onboarding_transcripts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
