-- Create scheduled_campaigns table
CREATE TABLE public.scheduled_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  product TEXT,
  links TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own scheduled campaigns"
ON public.scheduled_campaigns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled campaigns"
ON public.scheduled_campaigns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled campaigns"
ON public.scheduled_campaigns
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled campaigns"
ON public.scheduled_campaigns
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_campaigns_updated_at
BEFORE UPDATE ON public.scheduled_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();