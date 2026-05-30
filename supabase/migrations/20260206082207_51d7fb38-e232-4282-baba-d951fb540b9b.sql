-- Add validation trigger for properties table (using trigger instead of CHECK constraints for flexibility)
CREATE OR REPLACE FUNCTION public.validate_property_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate rent: must be positive and reasonable
  IF NEW.rent IS NULL OR NEW.rent <= 0 THEN
    RAISE EXCEPTION 'Rent must be a positive number';
  END IF;
  
  IF NEW.rent > 10000000 THEN
    RAISE EXCEPTION 'Rent exceeds maximum allowed value (10,000,000)';
  END IF;
  
  -- Validate deposit: must be non-negative
  IF NEW.deposit IS NOT NULL AND NEW.deposit < 0 THEN
    RAISE EXCEPTION 'Deposit cannot be negative';
  END IF;
  
  IF NEW.deposit IS NOT NULL AND NEW.deposit > 50000000 THEN
    RAISE EXCEPTION 'Deposit exceeds maximum allowed value (50,000,000)';
  END IF;
  
  -- Validate maintenance: must be non-negative if provided
  IF NEW.maintenance IS NOT NULL AND NEW.maintenance < 0 THEN
    RAISE EXCEPTION 'Maintenance cannot be negative';
  END IF;
  
  IF NEW.maintenance IS NOT NULL AND NEW.maintenance > 1000000 THEN
    RAISE EXCEPTION 'Maintenance exceeds maximum allowed value (1,000,000)';
  END IF;
  
  -- Validate title length
  IF NEW.title IS NULL OR length(NEW.title) < 10 THEN
    RAISE EXCEPTION 'Title must be at least 10 characters';
  END IF;
  
  IF length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Title must not exceed 200 characters';
  END IF;
  
  -- Validate description length if provided
  IF NEW.description IS NOT NULL AND length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Description must not exceed 5000 characters';
  END IF;
  
  -- Validate address length if provided
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address must not exceed 500 characters';
  END IF;
  
  -- Validate pincode format (6 digits for India)
  IF NEW.pincode IS NOT NULL AND NEW.pincode !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'Pincode must be exactly 6 digits';
  END IF;
  
  -- Validate amenities array size
  IF NEW.amenities IS NOT NULL AND array_length(NEW.amenities, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 amenities allowed';
  END IF;
  
  -- Validate images array size
  IF NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 10 THEN
    RAISE EXCEPTION 'Maximum 10 images allowed';
  END IF;
  
  -- Validate locality is not empty
  IF NEW.locality IS NULL OR length(trim(NEW.locality)) = 0 THEN
    RAISE EXCEPTION 'Locality is required';
  END IF;
  
  -- Validate property_type is not empty
  IF NEW.property_type IS NULL OR length(trim(NEW.property_type)) = 0 THEN
    RAISE EXCEPTION 'Property type is required';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS validate_property_before_save ON public.properties;
CREATE TRIGGER validate_property_before_save
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_property_data();