-- Return total_meetings configured by ketua_penasihat for the caller's school
-- (safe for guru to call without needing direct access to roles/profiles tables)
CREATE OR REPLACE FUNCTION public.get_school_total_meetings()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_id uuid;
  v_ketua_id uuid;
  v_total integer;
BEGIN
  v_school_id := public.get_user_school_id(auth.uid());

  IF v_school_id IS NULL THEN
    RETURN 12;
  END IF;

  SELECT ur.user_id
    INTO v_ketua_id
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'ketua_penasihat'::public.app_role
    AND p.school_id = v_school_id
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_ketua_id IS NULL THEN
    RETURN 12;
  END IF;

  SELECT ts.total_meetings
    INTO v_total
  FROM public.teacher_settings ts
  WHERE ts.user_id = v_ketua_id
  ORDER BY ts.updated_at DESC
  LIMIT 1;

  RETURN COALESCE(v_total, 12);
END;
$$;