-- Add is_demo flag to identify demo data
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE public.academic_sessions ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Create index for faster demo data queries
CREATE INDEX IF NOT EXISTS idx_schools_is_demo ON public.schools(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_students_is_demo ON public.students(is_demo) WHERE is_demo = true;