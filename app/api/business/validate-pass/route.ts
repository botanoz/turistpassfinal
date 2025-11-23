import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user (business)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      identifier,
      validationType, // 'qr_code' or 'pin_code'
      validatedBy,
      originalAmount,
      notes
    } = body;

    if (!identifier || !validationType) {
      return NextResponse.json({
        success: false,
        error: 'Identifier and validation type are required'
      }, { status: 400 });
    }

    // Resolve business_id for this auth user
    const { data: account } = await supabase
      .from('business_accounts')
      .select('business_id')
      .eq('id', user.id)
      .maybeSingle();

    const businessId = account?.business_id ?? null;
    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business profile is not linked'
      }, { status: 400 });
    }

    // Validate using PostgreSQL function with actual business_id
    const { data: validationResult, error: validateError } = await supabase
      .rpc('validate_pass', {
        p_identifier: identifier,
        p_validation_type: validationType,
        p_business_id: businessId
      });

    if (validateError) {
      console.error('Error validating pass:', validateError);
      throw validateError;
    }

    const result = validationResult?.[0];

    if (!result || !result.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: result?.message || 'Pass validation failed'
      });
    }

    const passData = result.pass_data;

    // Determine discount from pass-business mapping (admin client to bypass RLS)
    const supabaseAdmin = createAdminClient();
    let discountPercentage: number | null = null;
    try {
      // Find pass_id by name
      const { data: passRow } = await supabaseAdmin
        .from('passes')
        .select('id, name')
        .eq('name', passData.pass_name)
        .maybeSingle();

      if (passRow?.id) {
        const { data: pb } = await supabaseAdmin
          .from('pass_businesses')
          .select('discount')
          .eq('pass_id', passRow.id)
          .eq('business_id', businessId)
          .maybeSingle();
        if (pb?.discount !== undefined && pb?.discount !== null) {
          discountPercentage = Number(pb.discount);
        }
      }
    } catch (e) {
      // fallback: no discount found
    }

    // Calculate discounted amount
    const discountedAmount = originalAmount
      ? originalAmount * (1 - (discountPercentage ?? 0) / 100)
      : null;

    // Record usage in pass_usage_history
    const { error: usageError } = await supabase
      .from('pass_usage_history')
      .insert({
        purchased_pass_id: passData.id,
        business_id: businessId,
        validated_by: validatedBy || 'Unknown',
        validation_method: validationType,
        discount_percentage: discountPercentage,
        original_amount: originalAmount,
        discounted_amount: discountedAmount,
        notes
      });

    if (usageError) {
      console.error('Error recording usage:', usageError);
      // Don't fail the validation, just log the error
    }

    // Update usage count
    const newUsageCount = (passData.usage_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('purchased_passes')
      .update({
        usage_count: newUsageCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', passData.id);

    if (updateError) {
      console.error('Error updating usage count:', updateError);
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: 'Pass is valid',
      pass: {
        id: passData.id,
        passName: passData.pass_name,
        customerId: passData.customer_id,
        expiryDate: passData.expiry_date,
        usageCount: newUsageCount,
        maxUsage: passData.max_usage,
        discountApplied: {
          percentage: discountPercentage,
          originalAmount,
          discountedAmount,
          savings: originalAmount && discountedAmount
            ? originalAmount - discountedAmount
            : null
        }
      }
    });

  } catch (error: any) {
    console.error('Pass validation API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to validate pass'
    }, { status: 500 });
  }
}
