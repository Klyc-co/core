
CREATE TABLE public.klyc_marketing_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  channel TEXT NOT NULL,
  followers INT NOT NULL DEFAULT 0,
  posts_published INT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  engagements INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  spend NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(date, channel)
);

CREATE TABLE public.employee_advocacy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.klyc_employees(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  post_url TEXT,
  impressions INT NOT NULL DEFAULT 0,
  engagements INT NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.klyc_marketing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advocacy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage klyc_marketing_metrics"
  ON public.klyc_marketing_metrics FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage employee_advocacy"
  ON public.employee_advocacy FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
