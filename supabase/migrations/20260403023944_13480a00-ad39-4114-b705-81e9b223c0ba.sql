
DROP VIEW IF EXISTS public.google_drive_connections_safe;

CREATE VIEW public.google_drive_connections_safe
WITH (security_invoker = true) AS
SELECT
  id, user_id, folder_id, folder_url, connection_status,
  assets_sheet_id, assets_sheet_url,
  brand_guidelines_sheet_id, brand_guidelines_sheet_url,
  metadata, last_sync_at, created_at, updated_at
FROM public.google_drive_connections;
