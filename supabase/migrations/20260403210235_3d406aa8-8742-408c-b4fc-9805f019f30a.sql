
-- Enums
CREATE TYPE public.channel_status AS ENUM ('connected', 'disconnected', 'error');
CREATE TYPE public.billing_tier AS ENUM ('starter', 'growth', 'pro', 'enterprise');
CREATE TYPE public.billing_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'suspended');

-- 1. admin_users
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. admin_audit_log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. klyc_employees
CREATE TABLE public.klyc_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  display_name text,
  role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.klyc_employees ENABLE ROW LEVEL SECURITY;

-- 4. klyc_channels
CREATE TABLE public.klyc_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  account_name text,
  credentials_ref text,
  status channel_status NOT NULL DEFAULT 'disconnected',
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.klyc_channels ENABLE ROW LEVEL SECURITY;

-- 5. billing_subscriptions
CREATE TABLE public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  tier billing_tier NOT NULL DEFAULT 'starter',
  monthly_price integer NOT NULL DEFAULT 99,
  trial_start timestamptz,
  trial_end timestamptz,
  status billing_status NOT NULL DEFAULT 'trial',
  started_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. platform_metrics_daily
CREATE TABLE public.platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_clients integer DEFAULT 0,
  clients_by_tier jsonb,
  total_campaigns integer DEFAULT 0,
  total_tokens_used bigint DEFAULT 0,
  total_tokens_saved bigint DEFAULT 0,
  avg_compression_ratio numeric,
  api_cost_actual numeric,
  api_cost_without_compression numeric,
  mrr numeric,
  dictionary_size integer DEFAULT 0,
  dictionary_hit_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_metrics_daily ENABLE ROW LEVEL SECURITY;

-- 7. submind_health_snapshots
CREATE TABLE public.submind_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submind_id text NOT NULL,
  window_start timestamptz,
  window_end timestamptz,
  invocation_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  avg_latency_ms integer DEFAULT 0,
  approval_rate numeric,
  avg_tokens_in integer DEFAULT 0,
  avg_tokens_out integer DEFAULT 0,
  error_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.submind_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id)
  )
$$;

-- RLS: admin_users — only admins can read
CREATE POLICY "Admins can read admin_users"
  ON public.admin_users FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin_users"
  ON public.admin_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update admin_users"
  ON public.admin_users FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin_users"
  ON public.admin_users FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: admin_audit_log
CREATE POLICY "Admins can read audit_log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit_log"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS: klyc_employees
CREATE POLICY "Admins can manage employees"
  ON public.klyc_employees FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: klyc_channels
CREATE POLICY "Admins can manage channels"
  ON public.klyc_channels FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: billing_subscriptions (admin + service role for webhooks)
CREATE POLICY "Admins can manage billing"
  ON public.billing_subscriptions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: platform_metrics_daily
CREATE POLICY "Admins can manage metrics"
  ON public.platform_metrics_daily FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: submind_health_snapshots
CREATE POLICY "Admins can manage health snapshots"
  ON public.submind_health_snapshots FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Updated_at trigger for klyc_channels
CREATE TRIGGER update_klyc_channels_updated_at
  BEFORE UPDATE ON public.klyc_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed admin user
INSERT INTO public.admin_users (email, display_name)
VALUES ('kitchens@klyc.ai', 'Kitchens');
