-- Add column to store word-level timestamps for captions
ALTER TABLE public.segments 
ADD COLUMN words_json JSONB;

-- Comment explaining the structure
COMMENT ON COLUMN public.segments.words_json IS 'Array of {text, start, end} objects with timestamps in seconds for word-by-word captions';