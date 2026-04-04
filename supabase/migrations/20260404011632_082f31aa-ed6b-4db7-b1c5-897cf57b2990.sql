
-- Update is_admin() to include hardcoded allowlist
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  
  -- Hardcoded allowlist: always allowed
  IF _email IN ('ethanw@cipherstream.com', 'kitchens@klyc.ai') THEN
    RETURN TRUE;
  END IF;

  -- Check admin_users table
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = _email
      AND role IN ('admin', 'senior_admin')
  );
END;
$function$;

-- Add a permissive SELECT policy for authenticated users to check their own email
-- This allows the login flow to verify admin status before the chicken-and-egg RLS issue
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR is_admin(auth.uid())
  );
