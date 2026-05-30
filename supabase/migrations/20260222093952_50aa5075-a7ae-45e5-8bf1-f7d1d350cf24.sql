
-- Add is_direct_owner column to properties table
ALTER TABLE public.properties ADD COLUMN is_direct_owner boolean DEFAULT false;

-- Add unavailable_dates column to properties table
ALTER TABLE public.properties ADD COLUMN unavailable_dates jsonb DEFAULT '[]'::jsonb;
