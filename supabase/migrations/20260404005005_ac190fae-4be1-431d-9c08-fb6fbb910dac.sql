
-- 1. Add role column to admin_users (table already exists)
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

-- 2. Insert senior admin
INSERT INTO public.admin_users (email, role)
VALUES ('ethanw@cipherstream.com', 'senior_admin')
ON CONFLICT (email) DO UPDATE SET role = 'senior_admin';

-- 3. Update is_admin() to check role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id)
      AND role IN ('admin', 'senior_admin')
  )
$function$;

-- 4. Enable RLS and add policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
CREATE POLICY "Admins can read admin_users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
