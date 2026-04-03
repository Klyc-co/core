
CREATE TYPE public.roadmap_category AS ENUM ('infrastructure', 'subminds', 'frontend', 'integrations', 'business');
CREATE TYPE public.roadmap_status AS ENUM ('backlog', 'planning', 'design', 'build', 'test', 'shipped');
CREATE TYPE public.effort_size AS ENUM ('S', 'M', 'L', 'XL');

CREATE TABLE public.roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category roadmap_category NOT NULL DEFAULT 'frontend',
  status roadmap_status NOT NULL DEFAULT 'backlog',
  priority INT NOT NULL DEFAULT 100,
  effort effort_size NOT NULL DEFAULT 'M',
  target_date DATE,
  progress_pct INT NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES public.klyc_employees(id) ON DELETE SET NULL,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roadmap_items"
  ON public.roadmap_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
