-- Create marketer_clients table to link marketers with their clients
CREATE TABLE public.marketer_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(marketer_id, client_id)
);

-- Enable RLS
ALTER TABLE public.marketer_clients ENABLE ROW LEVEL SECURITY;

-- Marketers can see their own clients
CREATE POLICY "Marketers can view their clients"
ON public.marketer_clients
FOR SELECT
USING (auth.uid() = marketer_id);

-- Marketers can add clients
CREATE POLICY "Marketers can add clients"
ON public.marketer_clients
FOR INSERT
WITH CHECK (auth.uid() = marketer_id);

-- Marketers can update their client relationships
CREATE POLICY "Marketers can update their clients"
ON public.marketer_clients
FOR UPDATE
USING (auth.uid() = marketer_id);

-- Marketers can remove clients
CREATE POLICY "Marketers can delete their clients"
ON public.marketer_clients
FOR DELETE
USING (auth.uid() = marketer_id);

-- Clients can see relationships where they are the client
CREATE POLICY "Clients can view their marketer relationships"
ON public.marketer_clients
FOR SELECT
USING (auth.uid() = client_id);

-- Create messages table for marketer-client communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  marketer_client_id UUID REFERENCES public.marketer_clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages as read
CREATE POLICY "Users can update their received messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create campaign_approvals table for tracking approval requests
CREATE TABLE public.campaign_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_draft_id UUID REFERENCES public.campaign_drafts(id) ON DELETE CASCADE,
  scheduled_campaign_id UUID REFERENCES public.scheduled_campaigns(id) ON DELETE CASCADE,
  marketer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_approvals ENABLE ROW LEVEL SECURITY;

-- Marketers can create and view approval requests
CREATE POLICY "Marketers can manage their approval requests"
ON public.campaign_approvals
FOR ALL
USING (auth.uid() = marketer_id);

-- Clients can view and update approvals sent to them
CREATE POLICY "Clients can view approvals"
ON public.campaign_approvals
FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can update approval status"
ON public.campaign_approvals
FOR UPDATE
USING (auth.uid() = client_id);

-- Create client_profiles table for client profile data
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  website TEXT,
  description TEXT,
  industry TEXT,
  target_audience TEXT,
  value_proposition TEXT,
  logo_url TEXT,
  brand_colors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own profile
CREATE POLICY "Clients can manage their profile"
ON public.client_profiles
FOR ALL
USING (auth.uid() = user_id);

-- Marketers can view client profiles they're connected to
CREATE POLICY "Marketers can view connected client profiles"
ON public.client_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketer_clients
    WHERE marketer_clients.marketer_id = auth.uid()
    AND marketer_clients.client_id = client_profiles.user_id
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_marketer_clients_updated_at
BEFORE UPDATE ON public.marketer_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_approvals_updated_at
BEFORE UPDATE ON public.campaign_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();