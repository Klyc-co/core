-- Create brand_imports table to track website scans
CREATE TABLE public.brand_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  website_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create brand_assets table to store extracted assets
CREATE TABLE public.brand_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_import_id UUID REFERENCES public.brand_imports(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'image', 'color', 'font', 'copy'
  name TEXT,
  value TEXT NOT NULL, -- URL for images, hex for colors, font name, or copy text
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_imports
CREATE POLICY "Users can view their own brand imports" 
ON public.brand_imports FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand imports" 
ON public.brand_imports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand imports" 
ON public.brand_imports FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand imports" 
ON public.brand_imports FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for brand_assets
CREATE POLICY "Users can view their own brand assets" 
ON public.brand_assets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand assets" 
ON public.brand_assets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand assets" 
ON public.brand_assets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand assets" 
ON public.brand_assets FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for brand images
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);

-- Storage policies for brand-assets bucket
CREATE POLICY "Brand assets are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'brand-assets');

CREATE POLICY "Users can upload their own brand assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own brand assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own brand assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updated_at
CREATE TRIGGER update_brand_imports_updated_at
BEFORE UPDATE ON public.brand_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();