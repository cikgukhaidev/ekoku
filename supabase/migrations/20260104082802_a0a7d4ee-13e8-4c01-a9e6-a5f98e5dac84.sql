-- Create a function to get school class structure for any user in the same school
CREATE OR REPLACE FUNCTION public.get_school_class_structure()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_ketua_id uuid;
  v_structure jsonb;
BEGIN
  -- Get current user's school_id
  v_school_id := public.get_user_school_id(auth.uid());

  IF v_school_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Find ketua_penasihat for this school
  SELECT ur.user_id
    INTO v_ketua_id
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'ketua_penasihat'::public.app_role
    AND p.school_id = v_school_id
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_ketua_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Get class structure from ketua's settings
  SELECT ts.class_structure
    INTO v_structure
  FROM public.teacher_settings ts
  WHERE ts.user_id = v_ketua_id
  ORDER BY ts.updated_at DESC
  LIMIT 1;

  RETURN COALESCE(v_structure, '[]'::jsonb);
END;
$$;