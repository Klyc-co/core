
CREATE TABLE public.client_brand_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  role TEXT NOT NULL,
  hex_value TEXT NOT NULL,
  hue INTEGER,
  saturation INTEGER,
  lightness INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, role)
);

-- Add check constraint for valid roles
ALTER TABLE public.client_brand_colors
  ADD CONSTRAINT valid_role CHECK (role IN ('primary', 'secondary', 'accent', 'background', 'text'));

-- Add check constraint for valid hex format
ALTER TABLE public.client_brand_colors
  ADD CONSTRAINT valid_hex CHECK (hex_value ~ '^#[0-9a-fA-F]{6}$');

-- Enable RLS
ALTER TABLE public.client_brand_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand colors"
  ON public.client_brand_colors FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can insert their own brand colors"
  ON public.client_brand_colors FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own brand colors"
  ON public.client_brand_colors FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Users can delete their own brand colors"
  ON public.client_brand_colors FOR DELETE
  USING (auth.uid() = client_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_brand_colors_updated_at
  BEFORE UPDATE ON public.client_brand_colors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
