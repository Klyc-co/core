-- CRM Connections table to store connected CRM/commerce platforms
CREATE TABLE public.crm_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'hubspot', 'shopify', 'salesforce', 'zoho', 'pipedrive', 'woocommerce'
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'syncing', 'error', 'disconnected'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_minutes INTEGER NOT NULL DEFAULT 240, -- 4 hours
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Contacts table to store normalized contact data
CREATE TABLE public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company_name TEXT,
  lifecycle_stage TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL, -- 'hubspot', 'shopify', etc.
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

-- CRM Companies table (optional per provider)
CREATE TABLE public.crm_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  contact_count INTEGER DEFAULT 0,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

-- CRM Deals table (for CRM platforms like HubSpot, Salesforce)
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stage TEXT,
  value NUMERIC,
  currency TEXT DEFAULT 'USD',
  close_date DATE,
  owner TEXT,
  status TEXT,
  associated_contact_external_id TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

-- CRM Orders table (for commerce platforms like Shopify, WooCommerce)
CREATE TABLE public.crm_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT,
  order_date TIMESTAMP WITH TIME ZONE,
  associated_contact_external_id TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

-- CRM Sync Logs table
CREATE TABLE public.crm_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error'
  summary TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_connections
CREATE POLICY "Users can view their own CRM connections"
  ON public.crm_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM connections"
  ON public.crm_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM connections"
  ON public.crm_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM connections"
  ON public.crm_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for crm_contacts
CREATE POLICY "Users can view their own CRM contacts"
  ON public.crm_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM contacts"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM contacts"
  ON public.crm_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM contacts"
  ON public.crm_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for crm_companies
CREATE POLICY "Users can view their own CRM companies"
  ON public.crm_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM companies"
  ON public.crm_companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM companies"
  ON public.crm_companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM companies"
  ON public.crm_companies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for crm_deals
CREATE POLICY "Users can view their own CRM deals"
  ON public.crm_deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM deals"
  ON public.crm_deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM deals"
  ON public.crm_deals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM deals"
  ON public.crm_deals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for crm_orders
CREATE POLICY "Users can view their own CRM orders"
  ON public.crm_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM orders"
  ON public.crm_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM orders"
  ON public.crm_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM orders"
  ON public.crm_orders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for crm_sync_logs (via connection ownership)
CREATE POLICY "Users can view sync logs for their connections"
  ON public.crm_sync_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.crm_connections
    WHERE crm_connections.id = crm_sync_logs.connection_id
    AND crm_connections.user_id = auth.uid()
  ));

CREATE POLICY "Users can create sync logs for their connections"
  ON public.crm_sync_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_connections
    WHERE crm_connections.id = crm_sync_logs.connection_id
    AND crm_connections.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sync logs for their connections"
  ON public.crm_sync_logs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.crm_connections
    WHERE crm_connections.id = crm_sync_logs.connection_id
    AND crm_connections.user_id = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON public.crm_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_orders_updated_at
  BEFORE UPDATE ON public.crm_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_crm_connections_user_id ON public.crm_connections(user_id);
CREATE INDEX idx_crm_contacts_user_id ON public.crm_contacts(user_id);
CREATE INDEX idx_crm_contacts_connection_id ON public.crm_contacts(connection_id);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);
CREATE INDEX idx_crm_companies_user_id ON public.crm_companies(user_id);
CREATE INDEX idx_crm_companies_connection_id ON public.crm_companies(connection_id);
CREATE INDEX idx_crm_deals_user_id ON public.crm_deals(user_id);
CREATE INDEX idx_crm_deals_connection_id ON public.crm_deals(connection_id);
CREATE INDEX idx_crm_orders_user_id ON public.crm_orders(user_id);
CREATE INDEX idx_crm_orders_connection_id ON public.crm_orders(connection_id);
CREATE INDEX idx_crm_sync_logs_connection_id ON public.crm_sync_logs(connection_id);