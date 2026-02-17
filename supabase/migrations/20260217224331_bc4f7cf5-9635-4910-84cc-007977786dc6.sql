-- Remove duplicate crm_connections, keeping only the most recently updated one per (user_id, provider)
DELETE FROM public.crm_connections
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, provider) id
  FROM public.crm_connections
  ORDER BY user_id, provider, updated_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.crm_connections ADD CONSTRAINT crm_connections_user_id_provider_unique UNIQUE (user_id, provider);