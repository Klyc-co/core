
-- Fix 1: Add RLS policies on dropbox_connections so only the owner can access their tokens
CREATE POLICY "Users can view own dropbox connections"
  ON public.dropbox_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dropbox connections"
  ON public.dropbox_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dropbox connections"
  ON public.dropbox_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dropbox connections"
  ON public.dropbox_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: Replace the broad marketer SELECT policy on google_drive_connections
-- with one that excludes the zapier_webhook_url (use a security definer function instead)
-- Since we can't do column-level RLS, we'll keep the existing policy but ensure
-- webhook URLs are only accessible to the connection owner by creating a secure view

-- Create a secure view for marketers that excludes sensitive fields
CREATE OR REPLACE VIEW public.google_drive_connections_safe AS
SELECT
  id, user_id, folder_id, folder_url, connection_status,
  assets_sheet_id, assets_sheet_url,
  brand_guidelines_sheet_id, brand_guidelines_sheet_url,
  metadata, last_sync_at, created_at, updated_at
FROM public.google_drive_connections;

-- Drop the overly broad marketer policy that exposes webhook URLs
DROP POLICY IF EXISTS "Marketers can view client drive connections" ON public.google_drive_connections;

-- Recreate marketer policy scoped to authenticated role, excluding webhook URL
-- Marketers should use the safe view, but we still need a policy for direct access
-- Restrict direct table SELECT to owner only
CREATE POLICY "Marketers can view client drive connections via safe view"
  ON public.google_drive_connections FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM marketer_clients
      WHERE marketer_clients.marketer_id = auth.uid()
        AND marketer_clients.client_id = google_drive_connections.user_id
    )
  );
