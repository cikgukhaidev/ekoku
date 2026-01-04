-- Allow ketua_penasihat to view roles for users in their school
CREATE POLICY "Ketua penasihat can view roles in school"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'ketua_penasihat'::app_role) 
  AND user_id IN (
    SELECT p.user_id FROM profiles p 
    WHERE p.school_id = get_user_school_id(auth.uid())
  )
);