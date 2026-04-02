
-- orchestrator_sessions
CREATE TABLE public.orchestrator_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'guided',
  solo_permission_scope text,
  conversation_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_submind_dispatches jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orchestrator_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.orchestrator_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.orchestrator_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.orchestrator_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.orchestrator_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_orchestrator_sessions_updated_at
  BEFORE UPDATE ON public.orchestrator_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- solo_mode_logs
CREATE TABLE public.solo_mode_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.orchestrator_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  decision_point text NOT NULL,
  submind_called text,
  knp_payload_sent jsonb,
  knp_response_received jsonb,
  reasoning text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.solo_mode_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solo logs" ON public.solo_mode_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own solo logs" ON public.solo_mode_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
