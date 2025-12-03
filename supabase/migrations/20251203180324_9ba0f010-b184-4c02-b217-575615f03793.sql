-- Create campaign_drafts table
CREATE TABLE public.campaign_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_idea TEXT,
  content_type TEXT,
  target_audience TEXT,
  prompt TEXT,
  video_script TEXT,
  scene_prompts TEXT,
  post_caption TEXT,
  image_prompt TEXT,
  article_outline TEXT,
  campaign_goals TEXT,
  target_audience_description TEXT,
  campaign_objective TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own drafts"
ON public.campaign_drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
ON public.campaign_drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON public.campaign_drafts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON public.campaign_drafts FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_drafts_updated_at
BEFORE UPDATE ON public.campaign_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();