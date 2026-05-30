-- Add listing_type column to properties to support sale listings
ALTER TABLE public.properties 
ADD COLUMN listing_type text NOT NULL DEFAULT 'rent' 
CHECK (listing_type IN ('rent', 'sale'));

-- Add sale_price column for sale listings
ALTER TABLE public.properties 
ADD COLUMN sale_price numeric NULL;

-- Add validation: sale listings must have sale_price
CREATE OR REPLACE FUNCTION public.validate_listing_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_type = 'sale' AND (NEW.sale_price IS NULL OR NEW.sale_price <= 0) THEN
    RAISE EXCEPTION 'Sale listings must have a valid sale price';
  END IF;
  IF NEW.sale_price IS NOT NULL AND NEW.sale_price > 500000000 THEN
    RAISE EXCEPTION 'Sale price exceeds maximum allowed value (50 Cr)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_listing_type_trigger
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.validate_listing_type();