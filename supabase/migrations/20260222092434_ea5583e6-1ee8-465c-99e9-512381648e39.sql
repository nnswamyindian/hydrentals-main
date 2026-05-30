
-- Fix property_views insert policy to be less permissive
DROP POLICY "Anyone can insert views" ON public.property_views;
CREATE POLICY "Authenticated or anonymous can insert views" ON public.property_views
  FOR INSERT WITH CHECK (
    property_id IS NOT NULL AND 
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND status = 'approved')
  );
