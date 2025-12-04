-- Create scheduled_reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_term TEXT NOT NULL,
  schedule_time TIME NOT NULL,
  schedule_frequency TEXT NOT NULL DEFAULT 'daily',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_results table
CREATE TABLE public.report_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_report_id UUID REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  search_term TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sentiment TEXT DEFAULT 'Mixed',
  mentions INTEGER DEFAULT 0,
  sources INTEGER DEFAULT 0,
  positive_percent INTEGER DEFAULT 0,
  neutral_percent INTEGER DEFAULT 0,
  negative_percent INTEGER DEFAULT 0,
  summary TEXT,
  raw_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on scheduled_reports
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_reports
CREATE POLICY "Users can view their own scheduled reports"
ON public.scheduled_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled reports"
ON public.scheduled_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled reports"
ON public.scheduled_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled reports"
ON public.scheduled_reports FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on report_results
ALTER TABLE public.report_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_results
CREATE POLICY "Users can view their own report results"
ON public.report_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own report results"
ON public.report_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report results"
ON public.report_results FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on scheduled_reports
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();