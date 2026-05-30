
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  is_verified,
  phone,
  created_at
FROM public.profiles;
