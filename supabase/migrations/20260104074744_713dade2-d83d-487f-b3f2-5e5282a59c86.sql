-- Allow users to view teacher_settings of ketua_penasihat in their school
CREATE POLICY "Users can view school settings"
ON public.teacher_settings
FOR SELECT
USING (
  user_id IN (
    SELECT p.user_id FROM profiles p 
    WHERE p.school_id = get_user_school_id(auth.uid())
  )
);