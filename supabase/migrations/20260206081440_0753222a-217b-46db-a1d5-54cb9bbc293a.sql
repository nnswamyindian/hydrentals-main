-- =============================================
-- SECURITY FIXES MIGRATION
-- =============================================

-- 1. FIX PROFILES TABLE EXPOSURE
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy: users can only view their own profile or admins can view all
CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create a PUBLIC view with only non-sensitive fields for display purposes
-- (e.g., showing property owner name/avatar)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  avatar_url,
  is_verified,
  created_at
FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- 2. FIX NOTIFICATIONS SPAM VULNERABILITY
-- Drop the permissive INSERT policy that allows any authenticated user to spam
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Create restrictive policy: only allow users to insert notifications for themselves
-- System-generated notifications use SECURITY DEFINER triggers
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. ADD MESSAGE CONTENT LENGTH VALIDATION
-- Add CHECK constraint to prevent DoS via oversized messages
ALTER TABLE public.messages
ADD CONSTRAINT message_content_max_length 
CHECK (length(content) <= 5000);

-- 4. IMPROVE notify_new_message FUNCTION WITH DEFENSIVE VALIDATION
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Defensive check: ensure sender profile exists
  SELECT full_name INTO sender_name 
  FROM public.profiles 
  WHERE id = NEW.sender_id;
  
  -- Only create notification if sender profile exists
  IF sender_name IS NOT NULL OR EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.sender_id) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.receiver_id, 
      'New Message 💬', 
      'You have a new message from ' || COALESCE(sender_name, 'a user'), 
      'new_message'
    );
  END IF;
  
  RETURN NEW;
END;
$$;