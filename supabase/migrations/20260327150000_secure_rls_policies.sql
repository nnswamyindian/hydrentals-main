-- Security Migration: Enforce strict RLS on properties and payments tables

-- 1. Ensure RLS is enabled
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Prevent tenants/owners from inserting a property with status = 'approved' automatically
CREATE POLICY "Users can insert pending properties"
ON properties
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id 
  AND status = 'pending'
);

-- 3. Only admins can update the status
CREATE POLICY "Admins can update property status"
ON properties
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Owners can update their own property details but cannot alter status to approved
CREATE POLICY "Owners can update their own properties"
ON properties
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (
  status = 'pending' OR status = 'rejected' OR 
  -- Cannot change status if already approved via this policy
  (status = 'approved' AND status = xmax::text)
);

-- 5. Secure payments: Client inserting a payment must only submit as 'pending'
CREATE POLICY "Users can insert pending payments only"
ON payments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
);

-- 6. Admins or a secure backend system manage completed payments
CREATE POLICY "Admins can update payments"
ON payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
