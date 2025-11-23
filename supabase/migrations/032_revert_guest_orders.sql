-- Revert guest orders - require authentication for purchases
-- Security: Orders must have a valid customer account

-- Revert orders table
ALTER TABLE orders
ALTER COLUMN customer_id SET NOT NULL;

-- Remove guest order policies
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;

-- Restore original policies
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create own orders"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Revert purchased_passes table
ALTER TABLE purchased_passes
ALTER COLUMN customer_id SET NOT NULL;

DROP POLICY IF EXISTS "Customers can view own passes" ON purchased_passes;

CREATE POLICY "Customers can view own passes"
  ON purchased_passes FOR SELECT
  USING (customer_id = auth.uid());
