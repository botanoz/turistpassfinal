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
      validationType, // 'qr_code', 'pin_code', or 'promo_code'
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

    // Check if this is a campaign promo code
    if (validationType === 'promo_code' || identifier.length <= 20) {
      // Try to find a campaign with this promo code
      const supabaseAdmin = createAdminClient();
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from('business_campaigns')
        .select('*')
        .eq('business_id', businessId)
        .eq('promo_code', identifier.toUpperCase())
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .maybeSingle();

      if (campaign) {
        // Valid campaign found! Calculate discount
        let discountPercentage = 0;
        let discountAmount = 0;

        if (campaign.discount_type === 'percentage') {
          discountPercentage = campaign.discount_value;
          if (originalAmount) {
            discountAmount = (originalAmount * discountPercentage) / 100;
            // Apply maximum discount limit if set
            if (campaign.maximum_discount_amount && discountAmount > campaign.maximum_discount_amount) {
              discountAmount = campaign.maximum_discount_amount;
              discountPercentage = (discountAmount / originalAmount) * 100;
            }
          }
        } else if (campaign.discount_type === 'fixed_amount') {
          discountAmount = campaign.discount_value;
          if (originalAmount) {
            discountPercentage = (discountAmount / originalAmount) * 100;
          }
        }

        const discountedAmount = originalAmount ? originalAmount - discountAmount : null;

        // Check campaign limits
        const { data: redemptions } = await supabaseAdmin
          .from('campaign_redemptions')
          .select('id')
          .eq('campaign_id', campaign.id);

        const totalRedemptions = redemptions?.length || 0;

        if (campaign.max_redemptions && totalRedemptions >= campaign.max_redemptions) {
          return NextResponse.json({
            success: false,
            valid: false,
            message: 'Campaign redemption limit reached'
          });
        }

        // Check minimum purchase amount
        if (originalAmount && campaign.minimum_purchase_amount && originalAmount < campaign.minimum_purchase_amount) {
          return NextResponse.json({
            success: false,
            valid: false,
            message: `Minimum purchase amount is ₺${campaign.minimum_purchase_amount}`
          });
        }

        // Record campaign redemption
        const { error: redemptionError } = await supabaseAdmin
          .from('campaign_redemptions')
          .insert({
            campaign_id: campaign.id,
            business_id: businessId,
            redeemed_at: new Date().toISOString(),
            original_amount: originalAmount,
            discount_amount: discountAmount,
            notes
          });

        if (redemptionError) {
          console.error('Error recording campaign redemption:', redemptionError);
        }

        return NextResponse.json({
          success: true,
          valid: true,
          message: `Campaign "${campaign.title}" applied successfully!`,
          campaign: {
            id: campaign.id,
            title: campaign.title,
            campaignType: campaign.campaign_type,
            discountType: campaign.discount_type,
            discountValue: campaign.discount_value,
            discountApplied: {
              percentage: discountPercentage,
              originalAmount,
              discountedAmount,
              savings: discountAmount
            }
          }
        });
      }
    }

    // If not a promo code or campaign not found, try regular pass validation
    const { data: validationResult, error: validateError } = await supabase
      .rpc('validate_pass', {
        p_identifier: identifier,
        p_validation_type: validationType === 'promo_code' ? 'pin_code' : validationType,
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
        message: result?.message || 'Invalid code. Please check and try again.'
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
    const savingsAmount = originalAmount && discountedAmount
      ? originalAmount - discountedAmount
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

    // Log visit (use admin client to bypass RLS since business user inserts on behalf of customer)
    try {
      await supabaseAdmin
        .from('venue_visits')
        .insert({
          customer_id: passData.customer_id,
          business_id: businessId,
          purchased_pass_id: passData.id,
          status: 'completed',
          visit_date: new Date().toISOString(),
          discount_used: discountPercentage ?? 0,
          discount_amount: savingsAmount ?? 0,
          notes: validatedBy ? `Validated by ${validatedBy}` : null
        });
    } catch (visitError) {
      console.error('Error logging visit:', visitError);
      // Do not block validation response
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
          savings: savingsAmount
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
