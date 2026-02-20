-- Add media columns to scheduled_campaigns so video/image URLs persist
ALTER TABLE public.scheduled_campaigns
  ADD COLUMN video_url text,
  ADD COLUMN image_url text,
  ADD COLUMN media_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN post_caption text;