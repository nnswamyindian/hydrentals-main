
-- Create broker complaints table
CREATE TABLE public.broker_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  complainant_name TEXT NOT NULL,
  complainant_email TEXT NOT NULL,
  complainant_phone TEXT,
  broker_name TEXT NOT NULL,
  broker_phone TEXT,
  property_reference TEXT,
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_complaints ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a complaint (even anonymous)
CREATE POLICY "Anyone can submit complaints"
ON public.broker_complaints FOR INSERT
WITH CHECK (true);

-- Users can view their own complaints
CREATE POLICY "Users can view own complaints"
ON public.broker_complaints FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create community badges table
CREATE TABLE public.community_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL DEFAULT 'broker_reporter',
  badge_name TEXT NOT NULL,
  description TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  badge_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex')
);

ALTER TABLE public.community_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
ON public.community_badges FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Anyone can view badges publicly"
ON public.community_badges FOR SELECT
USING (true);

-- Function to auto-award badge after complaint
CREATE OR REPLACE FUNCTION public.award_community_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    -- Check if user already has this badge
    IF NOT EXISTS (SELECT 1 FROM public.community_badges WHERE user_id = NEW.user_id AND badge_type = 'broker_reporter') THEN
      INSERT INTO public.community_badges (user_id, badge_type, badge_name, description)
      VALUES (NEW.user_id, 'broker_reporter', 'Community Guardian 🛡️', 'Awarded for helping keep the rental community broker-free. This is a nationally recognized digital badge.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_badge_on_complaint
AFTER INSERT ON public.broker_complaints
FOR EACH ROW
EXECUTE FUNCTION public.award_community_badge();
