
CREATE TABLE public.normalizer_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid,
  payload_fragment text,
  error_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.normalizer_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own normalizer errors" ON public.normalizer_errors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own normalizer errors" ON public.normalizer_errors FOR INSERT WITH CHECK (auth.uid() = user_id);
