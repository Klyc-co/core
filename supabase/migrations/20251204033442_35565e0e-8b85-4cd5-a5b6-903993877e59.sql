-- Create table for storing social media trends
CREATE TABLE public.social_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  trend_name TEXT NOT NULL,
  trend_rank INTEGER,
  trend_category TEXT,
  trend_volume TEXT,
  trend_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by platform and date
CREATE INDEX idx_social_trends_platform_date ON public.social_trends (platform, scraped_at DESC);
CREATE INDEX idx_social_trends_user_date ON public.social_trends (user_id, scraped_at DESC);

-- Enable Row Level Security
ALTER TABLE public.social_trends ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own trends" 
ON public.social_trends 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trends" 
ON public.social_trends 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trends" 
ON public.social_trends 
FOR DELETE 
USING (auth.uid() = user_id);