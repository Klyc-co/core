-- Create table to store Zapier automation results
CREATE TABLE public.zapier_automation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_draft_id UUID REFERENCES public.campaign_drafts(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  payload_sent JSONB,
  result_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zapier_automation_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own automation results
CREATE POLICY "Users can view their own automation results"
ON public.zapier_automation_results
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own automation results
CREATE POLICY "Users can insert their own automation results"
ON public.zapier_automation_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own automation results
CREATE POLICY "Users can update their own automation results"
ON public.zapier_automation_results
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow service role to update results (for webhook callback)
CREATE POLICY "Service role can update automation results"
ON public.zapier_automation_results
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_zapier_automation_results_updated_at
BEFORE UPDATE ON public.zapier_automation_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();