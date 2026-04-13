
-- Create client-references storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-references', 'client-references', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client-references bucket
CREATE POLICY "Users can view their own references"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own references"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own references"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own references"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-references' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add reference_media_url to client_brand_colors for inspiration board
ALTER TABLE public.client_brand_colors
ADD COLUMN IF NOT EXISTS reference_media_url text;
