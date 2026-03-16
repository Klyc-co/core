ALTER TABLE public.projects DROP CONSTRAINT projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status = ANY (ARRAY['uploaded', 'processing', 'ready_for_edit', 'rendering', 'complete', 'error']));
UPDATE public.projects SET status = 'error' WHERE id = 'e24be456-2cce-4a3d-a996-a66af4458c41';