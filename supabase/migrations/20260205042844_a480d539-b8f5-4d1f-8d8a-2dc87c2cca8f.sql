-- Create product_assets junction table to store assets associated with products
CREATE TABLE public.product_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  asset_name TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  asset_type TEXT DEFAULT 'image',
  source TEXT DEFAULT 'upload',
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own product assets"
ON public.product_assets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product assets"
ON public.product_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product assets"
ON public.product_assets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product assets"
ON public.product_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_product_assets_product_id ON public.product_assets(product_id);
CREATE INDEX idx_product_assets_user_id ON public.product_assets(user_id);