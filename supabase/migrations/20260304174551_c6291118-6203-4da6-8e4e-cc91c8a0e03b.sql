
-- Add client_id to campaign_drafts
ALTER TABLE public.campaign_drafts ADD COLUMN client_id uuid;

-- Add client_id to scheduled_campaigns
ALTER TABLE public.scheduled_campaigns ADD COLUMN client_id uuid;

-- Backfill campaign_drafts: use post_queue.client_id if exists, else user_id
UPDATE public.campaign_drafts cd
SET client_id = COALESCE(
  (SELECT pq.client_id FROM public.post_queue pq WHERE pq.campaign_draft_id = cd.id LIMIT 1),
  cd.user_id
);

-- Backfill scheduled_campaigns: use campaign_approvals.client_id if exists, else user_id
UPDATE public.scheduled_campaigns sc
SET client_id = COALESCE(
  (SELECT ca.client_id FROM public.campaign_approvals ca WHERE ca.scheduled_campaign_id = sc.id LIMIT 1),
  sc.user_id
);

-- RLS for campaign_drafts: client can see their own rows
CREATE POLICY "Clients can view their campaign drafts"
ON public.campaign_drafts
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

-- RLS for campaign_drafts: marketer can access via marketer_clients
CREATE POLICY "Marketers can access client campaign drafts"
ON public.campaign_drafts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketer_clients
    WHERE marketer_clients.marketer_id = auth.uid()
      AND marketer_clients.client_id = campaign_drafts.client_id
  )
);

-- RLS for scheduled_campaigns: client can see their own rows
CREATE POLICY "Clients can view their scheduled campaigns"
ON public.scheduled_campaigns
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

-- RLS for scheduled_campaigns: marketer can access via marketer_clients
CREATE POLICY "Marketers can access client scheduled campaigns"
ON public.scheduled_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketer_clients
    WHERE marketer_clients.marketer_id = auth.uid()
      AND marketer_clients.client_id = scheduled_campaigns.client_id
  )
);
