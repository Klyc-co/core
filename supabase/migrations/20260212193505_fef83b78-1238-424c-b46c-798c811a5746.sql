
-- Create Loom connections table
CREATE TABLE IF NOT EXISTS public.loom_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_token TEXT NOT NULL,
  display_name TEXT DEFAULT 'Loom',
  connection_status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.loom_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own loom connections"
  ON public.loom_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loom connections"
  ON public.loom_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loom connections"
  ON public.loom_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loom connections"
  ON public.loom_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_loom_connections_updated_at
  BEFORE UPDATE ON public.loom_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
