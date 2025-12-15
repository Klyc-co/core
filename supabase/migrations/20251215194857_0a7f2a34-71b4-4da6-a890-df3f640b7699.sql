-- Fix 1: Create extensions schema and move extensions there
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move existing extensions to extensions schema (common ones)
-- Note: Some extensions may not exist, so we use IF EXISTS approach

-- Fix 3: Make videos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'videos';