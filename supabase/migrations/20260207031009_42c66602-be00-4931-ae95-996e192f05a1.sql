-- Store short-lived OAuth PKCE state for Salesforce (and future providers)
CREATE TABLE IF NOT EXISTS public.oauth_pkce_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS oauth_pkce_states_expires_at_idx
  ON public.oauth_pkce_states (expires_at);

ALTER TABLE public.oauth_pkce_states ENABLE ROW LEVEL SECURITY;

-- No client access; only service role (backend) should read/write.
-- (No policies created intentionally.)