
-- Enums
CREATE TYPE public.vote_category AS ENUM ('ui', 'subminds', 'speed', 'integrations', 'pricing', 'other');
CREATE TYPE public.vote_status AS ENUM ('new', 'under_review', 'planned', 'in_progress', 'shipped', 'declined');

-- Client votes table
CREATE TABLE public.client_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  submitted_by UUID,
  category vote_category NOT NULL DEFAULT 'other',
  status vote_status NOT NULL DEFAULT 'new',
  vote_count INT NOT NULL DEFAULT 1,
  roadmap_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vote records (one per client per vote item)
CREATE TABLE public.client_vote_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_item_id UUID NOT NULL REFERENCES public.client_votes(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vote_item_id, client_id)
);

-- RLS
ALTER TABLE public.client_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_vote_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client_votes"
  ON public.client_votes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage client_vote_records"
  ON public.client_vote_records FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_client_votes_updated_at
  BEFORE UPDATE ON public.client_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
