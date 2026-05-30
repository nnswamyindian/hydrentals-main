-- Fix the notifications insert policy to be more restrictive
-- Notifications should only be inserted by authenticated users or triggers
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);