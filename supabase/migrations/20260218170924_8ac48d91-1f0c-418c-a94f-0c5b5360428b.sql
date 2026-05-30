-- Allow authenticated users to read any profile's public fields via profiles_public view
CREATE POLICY "Authenticated users can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
