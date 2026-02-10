
-- ClickUp Connections
CREATE TABLE public.clickup_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_token TEXT NOT NULL,
  team_id TEXT,
  team_name TEXT,
  user_email TEXT,
  connection_status TEXT DEFAULT 'active',
  sync_frequency TEXT DEFAULT 'manual',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clickup_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clickup connections" ON public.clickup_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clickup connections" ON public.clickup_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clickup connections" ON public.clickup_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clickup connections" ON public.clickup_connections FOR DELETE USING (auth.uid() = user_id);

-- ClickUp Lists (spaces/folders/lists hierarchy)
CREATE TABLE public.clickup_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.clickup_connections(id) ON DELETE CASCADE,
  clickup_list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  space_name TEXT,
  folder_name TEXT,
  is_marketing_suggested BOOLEAN DEFAULT false,
  is_selected_for_sync BOOLEAN DEFAULT false,
  task_count INT DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, clickup_list_id)
);

ALTER TABLE public.clickup_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clickup lists" ON public.clickup_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clickup lists" ON public.clickup_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clickup lists" ON public.clickup_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clickup lists" ON public.clickup_lists FOR DELETE USING (auth.uid() = user_id);

-- ClickUp Tasks
CREATE TABLE public.clickup_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.clickup_connections(id) ON DELETE CASCADE,
  clickup_task_id TEXT NOT NULL,
  clickup_list_id TEXT NOT NULL,
  list_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  date_created TIMESTAMPTZ,
  assignees JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  url TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, clickup_task_id)
);

ALTER TABLE public.clickup_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clickup tasks" ON public.clickup_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clickup tasks" ON public.clickup_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clickup tasks" ON public.clickup_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clickup tasks" ON public.clickup_tasks FOR DELETE USING (auth.uid() = user_id);

-- ClickUp Attachments
CREATE TABLE public.clickup_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.clickup_connections(id) ON DELETE CASCADE,
  clickup_task_id TEXT NOT NULL,
  task_title TEXT,
  list_name TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clickup_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clickup attachments" ON public.clickup_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clickup attachments" ON public.clickup_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clickup attachments" ON public.clickup_attachments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clickup attachments" ON public.clickup_attachments FOR DELETE USING (auth.uid() = user_id);
