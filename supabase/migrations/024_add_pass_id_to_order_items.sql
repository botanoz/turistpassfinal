-- =====================================================
-- MIGRATION: Add pass_id to order_items
-- =====================================================
-- Description: Adds pass_id column to order_items table
-- and updates existing records based on pass_name
-- Date: 2025-10-31
-- =====================================================

-- Add pass_id column (nullable initially so we can populate it)
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS pass_id UUID;

-- Add foreign key constraint
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_pass
FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE SET NULL;

-- Update existing order_items to set pass_id based on pass_name
UPDATE order_items oi
SET pass_id = p.id
FROM passes p
WHERE oi.pass_name = p.name
  AND oi.pass_id IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_pass_id ON order_items(pass_id);

-- =====================================================
