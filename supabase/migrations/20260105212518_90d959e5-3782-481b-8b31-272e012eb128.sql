-- Add UPDATE policy for competitor_analyses table
CREATE POLICY "Users can update their own analyses"
ON public.competitor_analyses
FOR UPDATE
USING (auth.uid() = user_id);