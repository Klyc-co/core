
CREATE POLICY "Users can insert their own PKCE states"
ON public.oauth_pkce_states
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own PKCE states"
ON public.oauth_pkce_states
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PKCE states"
ON public.oauth_pkce_states
FOR DELETE
USING (auth.uid() = user_id);
