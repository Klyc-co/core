-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  original_video_url TEXT,
  duration_seconds NUMERIC,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready_for_edit', 'rendering', 'complete')),
  final_video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create segments table
CREATE TABLE public.segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  start_seconds NUMERIC NOT NULL,
  end_seconds NUMERIC NOT NULL,
  transcript_snippet TEXT,
  visual_prompt TEXT,
  use_broll BOOLEAN NOT NULL DEFAULT false,
  broll_status TEXT NOT NULL DEFAULT 'not_generated' CHECK (broll_status IN ('not_generated', 'generating', 'generated', 'failed')),
  broll_video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view their own projects" 
ON public.projects FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects FOR DELETE 
USING (auth.uid() = owner_id);

-- RLS policies for segments (via project ownership)
CREATE POLICY "Users can view segments of their projects" 
ON public.segments FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = segments.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "Users can create segments for their projects" 
ON public.segments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = segments.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "Users can update segments of their projects" 
ON public.segments FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = segments.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "Users can delete segments of their projects" 
ON public.segments FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = segments.project_id AND projects.owner_id = auth.uid()));

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Storage policies
CREATE POLICY "Users can upload videos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Users can update their videos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their videos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();