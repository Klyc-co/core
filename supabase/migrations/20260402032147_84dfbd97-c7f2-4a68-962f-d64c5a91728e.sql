CREATE TABLE public.approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  user_id uuid NOT NULL,
  session_id uuid,
  category text,
  what_was_proposed text,
  what_was_originally_asked text,
  decision text,
  decided_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own approval history" ON public.approval_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access approval history" ON public.approval_history FOR ALL TO service_role USING (true) WITH CHECK (true);