CREATE POLICY "Users can read own competitor alerts"
ON public.competitor_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketer_clients mc
    WHERE mc.client_id = competitor_alerts.client_id
      AND mc.marketer_id = auth.uid()
  )
);