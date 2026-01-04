-- Create activity_logs table
CREATE TABLE public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    school_id UUID,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'upload', 'download', 'error'
    entity_type TEXT NOT NULL, -- 'student', 'session', 'announcement', 'meeting', 'attendance', 'user'
    entity_id UUID,
    description TEXT NOT NULL,
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_school_id ON public.activity_logs(school_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Superadmin can see all logs
CREATE POLICY "Superadmin can view all logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Ketua penasihat can see school logs
CREATE POLICY "Ketua penasihat can view school logs"
ON public.activity_logs
FOR SELECT
USING (
    has_role(auth.uid(), 'ketua_penasihat'::app_role) 
    AND school_id = get_user_school_id(auth.uid())
);

-- Guru can see own logs
CREATE POLICY "Guru can view own logs"
ON public.activity_logs
FOR SELECT
USING (
    has_role(auth.uid(), 'guru'::app_role) 
    AND user_id = auth.uid()
);

-- All authenticated users can insert their own logs
CREATE POLICY "Users can insert own logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());