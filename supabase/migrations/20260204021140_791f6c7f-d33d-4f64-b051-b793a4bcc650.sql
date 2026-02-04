-- Create post queue table for AI-generated posts awaiting approval/scheduling
CREATE TABLE public.post_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  campaign_draft_id UUID REFERENCES public.campaign_drafts(id) ON DELETE SET NULL,
  
  -- Post content
  content_type TEXT NOT NULL DEFAULT 'text',
  post_text TEXT,
  media_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  image_url TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Status: draft, pending_approval, approved, scheduled, publishing, published, failed
  status TEXT NOT NULL DEFAULT 'draft',
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post platform targets (which platforms to publish to)
CREATE TABLE public.post_platform_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_queue_id UUID NOT NULL REFERENCES public.post_queue(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post analytics table for tracking performance
CREATE TABLE public.post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_queue_id UUID NOT NULL REFERENCES public.post_queue(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  
  -- Engagement metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  
  -- Raw API response for platform-specific data
  raw_metrics JSONB DEFAULT '{}',
  
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_platform_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_queue
CREATE POLICY "Users can view their own posts" ON public.post_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts" ON public.post_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.post_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.post_queue
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Clients can view posts targeting them" ON public.post_queue
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can update approval status" ON public.post_queue
  FOR UPDATE USING (auth.uid() = client_id);

-- RLS Policies for post_platform_targets
CREATE POLICY "Users can view their post targets" ON public.post_platform_targets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.post_queue WHERE id = post_queue_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create their post targets" ON public.post_platform_targets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.post_queue WHERE id = post_queue_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their post targets" ON public.post_platform_targets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.post_queue WHERE id = post_queue_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their post targets" ON public.post_platform_targets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.post_queue WHERE id = post_queue_id AND user_id = auth.uid())
  );

-- RLS Policies for post_analytics
CREATE POLICY "Users can view their post analytics" ON public.post_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.post_queue WHERE id = post_queue_id AND user_id = auth.uid())
  );

CREATE POLICY "System can insert analytics" ON public.post_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update analytics" ON public.post_analytics
  FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_post_queue_updated_at
  BEFORE UPDATE ON public.post_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_post_queue_user_id ON public.post_queue(user_id);
CREATE INDEX idx_post_queue_status ON public.post_queue(status);
CREATE INDEX idx_post_queue_scheduled_at ON public.post_queue(scheduled_at);
CREATE INDEX idx_post_platform_targets_post_id ON public.post_platform_targets(post_queue_id);
CREATE INDEX idx_post_analytics_post_id ON public.post_analytics(post_queue_id);