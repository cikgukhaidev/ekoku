-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'ketua_penasihat', 'guru');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('hadir', 'tidak_hadir', 'lewat');

-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    unit_name TEXT,
    must_change_password BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create academic_sessions table
CREATE TABLE public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (school_id, year)
);

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.academic_sessions(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    form_level INTEGER NOT NULL CHECK (form_level >= 1 AND form_level <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetings table
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.academic_sessions(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    meeting_number INTEGER NOT NULL,
    meeting_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'hadir',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (meeting_id, student_id)
);

-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false,
    target_role app_role,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table for teacher-specific settings
CREATE TABLE public.teacher_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_meetings INTEGER DEFAULT 12,
    class_structure JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = _user_id
$$;

-- RLS Policies for schools
CREATE POLICY "Superadmin can manage schools" ON public.schools
    FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their school" ON public.schools
    FOR SELECT USING (id = public.get_user_school_id(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Superadmin can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Ketua penasihat can manage profiles in same school" ON public.profiles
    FOR ALL USING (
        public.has_role(auth.uid(), 'ketua_penasihat') 
        AND school_id = public.get_user_school_id(auth.uid())
    );

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Superadmin can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Ketua penasihat can assign guru role" ON public.user_roles
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'ketua_penasihat') 
        AND role = 'guru'
    );

-- RLS Policies for academic_sessions
CREATE POLICY "Users can view sessions in their school" ON public.academic_sessions
    FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Superadmin can manage all sessions" ON public.academic_sessions
    FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Ketua penasihat can manage school sessions" ON public.academic_sessions
    FOR ALL USING (
        public.has_role(auth.uid(), 'ketua_penasihat')
        AND school_id = public.get_user_school_id(auth.uid())
    );

-- RLS Policies for students
CREATE POLICY "Teachers can manage own students" ON public.students
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Ketua penasihat can view all students in school" ON public.students
    FOR SELECT USING (
        public.has_role(auth.uid(), 'ketua_penasihat')
        AND session_id IN (
            SELECT id FROM public.academic_sessions 
            WHERE school_id = public.get_user_school_id(auth.uid())
        )
    );

-- RLS Policies for meetings
CREATE POLICY "Teachers can manage own meetings" ON public.meetings
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Ketua penasihat can view all meetings in school" ON public.meetings
    FOR SELECT USING (
        public.has_role(auth.uid(), 'ketua_penasihat')
        AND session_id IN (
            SELECT id FROM public.academic_sessions 
            WHERE school_id = public.get_user_school_id(auth.uid())
        )
    );

-- RLS Policies for attendance
CREATE POLICY "Teachers can manage attendance for own meetings" ON public.attendance
    FOR ALL USING (
        meeting_id IN (SELECT id FROM public.meetings WHERE teacher_id = auth.uid())
    );

CREATE POLICY "Ketua penasihat can view all attendance in school" ON public.attendance
    FOR SELECT USING (
        public.has_role(auth.uid(), 'ketua_penasihat')
        AND meeting_id IN (
            SELECT m.id FROM public.meetings m
            JOIN public.academic_sessions s ON m.session_id = s.id
            WHERE s.school_id = public.get_user_school_id(auth.uid())
        )
    );

-- RLS Policies for announcements
CREATE POLICY "Everyone can view relevant announcements" ON public.announcements
    FOR SELECT USING (
        is_global = true 
        OR school_id = public.get_user_school_id(auth.uid())
    );

CREATE POLICY "Superadmin can manage announcements" ON public.announcements
    FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Ketua penasihat can create announcements for school" ON public.announcements
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'ketua_penasihat')
        AND school_id = public.get_user_school_id(auth.uid())
    );

-- RLS Policies for teacher_settings
CREATE POLICY "Teachers can manage own settings" ON public.teacher_settings
    FOR ALL USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_sessions_updated_at BEFORE UPDATE ON public.academic_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_settings_updated_at BEFORE UPDATE ON public.teacher_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user creation (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();