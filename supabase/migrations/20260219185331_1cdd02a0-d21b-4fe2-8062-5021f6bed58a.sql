
CREATE TABLE public.riverside_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_token TEXT NOT NULL,
  display_name TEXT DEFAULT 'Riverside',
  connection_status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.riverside_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own riverside connections"
ON public.riverside_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own riverside connections"
ON public.riverside_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own riverside connections"
ON public.riverside_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own riverside connections"
ON public.riverside_connections FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_riverside_connections_updated_at
BEFORE UPDATE ON public.riverside_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
