
CREATE TABLE public.client_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT,
  role TEXT,
  description TEXT,
  reference_image_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own characters" ON public.client_characters FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create their own characters" ON public.client_characters FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update their own characters" ON public.client_characters FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Users can delete their own characters" ON public.client_characters FOR DELETE USING (auth.uid() = client_id);

CREATE TRIGGER update_client_characters_updated_at
  BEFORE UPDATE ON public.client_characters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_scene_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  setting_type TEXT,
  setting_description TEXT,
  mood_atmosphere JSONB DEFAULT '[]'::jsonb,
  lighting TEXT,
  background_notes TEXT,
  reference_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_scene_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scene settings" ON public.client_scene_settings FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create their own scene settings" ON public.client_scene_settings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update their own scene settings" ON public.client_scene_settings FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Users can delete their own scene settings" ON public.client_scene_settings FOR DELETE USING (auth.uid() = client_id);

CREATE TRIGGER update_client_scene_settings_updated_at
  BEFORE UPDATE ON public.client_scene_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
