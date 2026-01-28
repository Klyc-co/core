-- Add new columns for comprehensive business profile data
ALTER TABLE public.client_profiles
ADD COLUMN IF NOT EXISTS product_category text,
ADD COLUMN IF NOT EXISTS geography_markets text,
ADD COLUMN IF NOT EXISTS marketing_goals text,
ADD COLUMN IF NOT EXISTS main_competitors text,
ADD COLUMN IF NOT EXISTS audience_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS value_data jsonb DEFAULT '{}'::jsonb;