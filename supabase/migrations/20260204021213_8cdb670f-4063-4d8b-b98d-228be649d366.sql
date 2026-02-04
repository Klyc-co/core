-- Fix overly permissive analytics policies by removing them and only allowing service role access
DROP POLICY IF EXISTS "System can insert analytics" ON public.post_analytics;
DROP POLICY IF EXISTS "System can update analytics" ON public.post_analytics;

-- Analytics should only be inserted/updated by backend edge functions using service role
-- No user-facing INSERT/UPDATE policies needed - the service role bypasses RLS