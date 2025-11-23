import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    // First, let's check if the column exists by trying to select it
    const { error: checkError } = await supabaseAdmin
      .from('purchased_passes')
      .select('pin_code')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'pin_code column already exists!'
      });
    }

    // Column doesn't exist (or there's an error), we need to add it using raw SQL
    // We'll use a workaround: create a temporary table and check structure
    return NextResponse.json({
      success: false,
      message: 'Cannot add column via API - please run migration using Supabase Dashboard SQL Editor',
      instructions: [
        '1. Go to Supabase Dashboard -> SQL Editor',
        '2. Run this SQL:',
        `
ALTER TABLE purchased_passes
ADD COLUMN IF NOT EXISTS pin_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchased_passes_pin_code
ON purchased_passes(pin_code) WHERE pin_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS pass_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, pass_id)
);

CREATE INDEX IF NOT EXISTS idx_pass_favorites_customer ON pass_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_pass_favorites_pass ON pass_favorites(pass_id);

ALTER TABLE pass_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own favorites"
  ON pass_favorites FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can add favorites"
  ON pass_favorites FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can remove own favorites"
  ON pass_favorites FOR DELETE
  USING (customer_id = auth.uid());

CREATE TABLE IF NOT EXISTS pass_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchased_pass_id UUID NOT NULL REFERENCES purchased_passes(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  validated_by TEXT,
  validation_method TEXT CHECK (validation_method IN ('qr_code', 'pin_code', 'manual')) DEFAULT 'qr_code',
  discount_percentage INT,
  original_amount NUMERIC,
  discounted_amount NUMERIC,
  validation_location TEXT,
  device_info JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pass_usage_purchased_pass ON pass_usage_history(purchased_pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_usage_business ON pass_usage_history(business_id);

ALTER TABLE pass_usage_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION generate_pin_code()
RETURNS TEXT AS $func$
DECLARE
  new_pin TEXT;
  pin_exists BOOLEAN;
BEGIN
  LOOP
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM purchased_passes WHERE pin_code = new_pin) INTO pin_exists;
    EXIT WHEN NOT pin_exists;
  END LOOP;
  RETURN new_pin;
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_activation_code()
RETURNS TEXT AS $func$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'PASS-' || UPPER(REPLACE(gen_random_uuid()::TEXT, '-', ''));
    SELECT EXISTS(SELECT 1 FROM purchased_passes WHERE activation_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_pass(
  p_identifier TEXT,
  p_validation_type TEXT,
  p_business_id UUID
)
RETURNS TABLE (
  valid BOOLEAN,
  message TEXT,
  pass_data JSONB
) AS $func$
DECLARE
  v_pass purchased_passes%ROWTYPE;
BEGIN
  IF p_validation_type = 'qr_code' THEN
    SELECT * INTO v_pass FROM purchased_passes WHERE activation_code = p_identifier;
  ELSIF p_validation_type = 'pin_code' THEN
    SELECT * INTO v_pass FROM purchased_passes WHERE pin_code = p_identifier;
  ELSE
    RETURN QUERY SELECT false, 'Invalid validation type', NULL::JSONB;
    RETURN;
  END IF;

  IF v_pass.id IS NULL THEN
    RETURN QUERY SELECT false, 'Pass not found', NULL::JSONB;
    RETURN;
  END IF;

  IF v_pass.status != 'active' THEN
    RETURN QUERY SELECT false, 'Pass is inactive', NULL::JSONB;
    RETURN;
  END IF;

  IF v_pass.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, 'Pass has expired', NULL::JSONB;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    'Pass is valid',
    jsonb_build_object(
      'id', v_pass.id,
      'pass_name', v_pass.pass_name,
      'customer_id', v_pass.customer_id,
      'expiry_date', v_pass.expiry_date,
      'usage_count', v_pass.usage_count,
      'max_usage', v_pass.max_usage
    );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
        `,
        '3. Click "Run" to execute the migration'
      ],
      error: checkError.message
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
