-- Allow guest orders by making customer_id nullable
-- For simulation purposes, orders can be created without a customer account

ALTER TABLE orders
ALTER COLUMN customer_id DROP NOT NULL;

-- Update the RLS policies to allow guest orders
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Customers can create own orders" ON orders;

-- Customers can view their own orders (if customer_id matches)
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid() OR customer_id IS NULL);

-- Allow creating orders without authentication (for guest purchases)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Same for purchased_passes
ALTER TABLE purchased_passes
ALTER COLUMN customer_id DROP NOT NULL;

DROP POLICY IF EXISTS "Customers can view own passes" ON purchased_passes;

CREATE POLICY "Customers can view own passes"
  ON purchased_passes FOR SELECT
  USING (customer_id = auth.uid() OR customer_id IS NULL);
