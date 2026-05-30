-- Allow admins to view all user roles (needed for admin dashboard)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles or admin can view all"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);

-- Allow admins to insert roles for other users (for role management)
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

CREATE POLICY "Users can insert own roles or admin can insert any"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);