
-- ==========================================
-- 1. REVIEWS TABLE
-- ==========================================
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one review per user per property
ALTER TABLE public.reviews ADD CONSTRAINT unique_user_property_review UNIQUE (user_id, property_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 2. SAVED SEARCHES TABLE
-- ==========================================
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved searches" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. PROPERTY REPORTS TABLE
-- ==========================================
CREATE TABLE public.property_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can report" ON public.property_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports or admin" ON public.property_reports
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports" ON public.property_reports
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- ==========================================
-- 4. VISIT REQUESTS TABLE
-- ==========================================
CREATE TABLE public.visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  visit_date date NOT NULL,
  visit_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can create visit requests" ON public.visit_requests
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Participants can view visit requests" ON public.visit_requests
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = owner_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can update visit requests" ON public.visit_requests
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = tenant_id);

CREATE POLICY "Tenants can delete own visit requests" ON public.visit_requests
  FOR DELETE USING (auth.uid() = tenant_id);

-- ==========================================
-- 5. PROPERTY VIEWS TABLE
-- ==========================================
CREATE TABLE public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON public.property_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners and admins can view analytics" ON public.property_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Enable realtime for visit_requests and reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
