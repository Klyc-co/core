
CREATE TABLE public.campaign_interview_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  campaign_draft_id UUID REFERENCES public.campaign_drafts(id) ON DELETE SET NULL,
  transcript TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_interview_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign transcripts"
  ON public.campaign_interview_transcripts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign transcripts"
  ON public.campaign_interview_transcripts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign transcripts"
  ON public.campaign_interview_transcripts
  FOR DELETE
  USING (auth.uid() = user_id);
