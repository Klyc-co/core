-- Drop the overly permissive policy and rely on service role for webhook updates
DROP POLICY IF EXISTS "Service role can update automation results" ON public.zapier_automation_results;