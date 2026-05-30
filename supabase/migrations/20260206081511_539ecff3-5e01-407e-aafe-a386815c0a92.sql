-- Fix the SECURITY DEFINER view warning by using SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate view with explicit SECURITY INVOKER (the safe default)
CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
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