-- Create Trello connections table
CREATE TABLE IF NOT EXISTS public.trello_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL,
  api_token TEXT NOT NULL,
  member_id TEXT,
  display_name TEXT DEFAULT 'Trello',
  connection_status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.trello_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view own trello connections"
  ON public.trello_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trello connections"
  ON public.trello_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trello connections"
  ON public.trello_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trello connections"
  ON public.trello_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_trello_connections_updated_at
  BEFORE UPDATE ON public.trello_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();