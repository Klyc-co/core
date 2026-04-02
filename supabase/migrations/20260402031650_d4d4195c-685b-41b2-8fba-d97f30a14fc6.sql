CREATE TABLE public.product_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  user_id uuid NOT NULL,
  product_name text,
  category text,
  price_point text,
  key_features text[],
  green_claims text[],
  yellow_claims text[],
  red_claims text[],
  voice_indicators jsonb DEFAULT '{}'::jsonb,
  differentiators text[],
  certifications text[],
  audience_outcome text,
  moat_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product profiles" ON public.product_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access product profiles" ON public.product_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);