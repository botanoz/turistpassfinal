-- Migration: Add invoice and receipt URL columns to orders table
-- Description: Allow admins to upload invoice/receipt documents for customer orders
-- Date: 2025-12-02

-- Add document URL columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add indexes for quick lookup of orders without documents
CREATE INDEX IF NOT EXISTS idx_orders_no_invoice
ON orders(id)
WHERE invoice_url IS NULL AND payment_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_orders_no_receipt
ON orders(id)
WHERE receipt_url IS NULL AND payment_status = 'completed';

-- Add comment
COMMENT ON COLUMN orders.invoice_url IS 'URL to uploaded invoice document (PDF or image)';
COMMENT ON COLUMN orders.receipt_url IS 'URL to uploaded receipt/fiş document (PDF or image)';
