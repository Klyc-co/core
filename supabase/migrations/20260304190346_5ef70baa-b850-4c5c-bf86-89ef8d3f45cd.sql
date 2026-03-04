CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  event_type TEXT NOT NULL,
  event_message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity events"
  ON public.activity_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity events"
  ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity events"
  ON public.activity_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX idx_activity_events_event_type ON public.activity_events(event_type);
CREATE INDEX idx_activity_events_created_at ON public.activity_events(created_at DESC);