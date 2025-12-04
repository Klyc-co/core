-- Create competitor_analyses table
CREATE TABLE public.competitor_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Analysis results
  company_description TEXT,
  target_audience TEXT,
  value_proposition TEXT,
  key_products TEXT,
  pricing_strategy TEXT,
  marketing_channels TEXT,
  strengths TEXT,
  weaknesses TEXT,
  opportunities TEXT,
  threats TEXT,
  
  -- Raw data
  raw_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own analyses"
ON public.competitor_analyses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
ON public.competitor_analyses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.competitor_analyses
FOR DELETE
USING (auth.uid() = user_id);