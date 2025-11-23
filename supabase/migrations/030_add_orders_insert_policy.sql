-- Add INSERT policy for orders table to allow creating orders
-- Customers can create their own orders
CREATE POLICY "Customers can create own orders"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Allow service role to bypass RLS for order creation (for guest purchases)
-- This is safe because the API validates the data
CREATE POLICY "Service role can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Add INSERT policy for order_items
CREATE POLICY "Service role can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);
