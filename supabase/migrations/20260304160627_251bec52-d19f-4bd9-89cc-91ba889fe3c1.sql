
-- Client Brain: persistent per-client data store for orchestrator & agents
CREATE TABLE public.client_brain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  document_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, document_type)
);

-- RLS
ALTER TABLE public.client_brain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own brain data"
  ON public.client_brain FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Marketers can view client brain data"
  ON public.client_brain FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketer_clients
      WHERE marketer_clients.marketer_id = auth.uid()
        AND marketer_clients.client_id = client_brain.client_id
    )
  );

-- Auto-update updated_at
CREATE TRIGGER update_client_brain_updated_at
  BEFORE UPDATE ON public.client_brain
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
