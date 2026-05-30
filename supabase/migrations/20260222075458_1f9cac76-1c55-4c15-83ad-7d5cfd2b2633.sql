
-- Create a view for admin verifications that masks Aadhaar numbers
CREATE OR REPLACE VIEW public.profiles_admin_verification
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  phone,
  avatar_url,
  CASE 
    WHEN aadhaar_number IS NOT NULL THEN '****' || RIGHT(aadhaar_number, 4)
    ELSE NULL
  END AS aadhaar_masked,
  is_verified,
  verification_status,
  created_at
FROM public.profiles;

-- Grant access
GRANT SELECT ON public.profiles_admin_verification TO authenticated;
