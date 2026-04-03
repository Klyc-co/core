
-- Enums
CREATE TYPE public.collab_priority AS ENUM ('urgent', 'normal', 'low');
CREATE TYPE public.collab_status AS ENUM ('new', 'in_progress', 'waiting_on_client', 'resolved');
CREATE TYPE public.collab_sender AS ENUM ('client', 'admin');

-- Tickets
CREATE TABLE public.collaboration_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  subject TEXT NOT NULL,
  priority collab_priority NOT NULL DEFAULT 'normal',
  status collab_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES public.klyc_employees(id),
  resolved_at TIMESTAMPTZ,
  resolution_time_ms BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.collaboration_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.collaboration_tickets(id) ON DELETE CASCADE,
  sender_type collab_sender NOT NULL,
  sender_id UUID,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_collaboration_tickets_updated
  BEFORE UPDATE ON public.collaboration_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.collaboration_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on collaboration_tickets"
  ON public.collaboration_tickets FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins full access on collaboration_messages"
  ON public.collaboration_messages FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
