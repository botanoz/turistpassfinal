import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// PUT - Update subscription plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { id: planId } = await params;

    // Generate slug from name if name changed
    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Determine plan type based on price
    let planType = 'custom';
    if (body.price === 0) planType = 'free';
    else if (body.price < 500) planType = 'starter';
    else if (body.price < 2000) planType = 'professional';
    else planType = 'enterprise';

    const { data: plan, error } = await supabase
      .from('business_subscription_plans')
      .update({
        name: body.name,
        slug: slug,
        description: body.description,
        plan_type: planType,
        price: body.price,
        billing_cycle: body.billing_period,
        currency: body.currency,
        features: body.features,
        limits: body.limits,
        is_active: body.is_active,
        trial_days: body.trial_days
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      plan
    });

  } catch (error: any) {
    console.error('Update subscription plan error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update subscription plan'
    }, { status: 500 });
  }
}

// DELETE - Delete subscription plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id: planId } = await params;

    // Check if any subscriptions are using this plan
    const { data: subscriptions } = await supabase
      .from('business_subscriptions')
      .select('id')
      .eq('plan_id', planId)
      .limit(1);

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete plan that is being used by subscriptions. Deactivate it instead.'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('business_subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Error deleting subscription plan:', error);
      throw error;
    }

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {
    console.error('Delete subscription plan error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete subscription plan'
    }, { status: 500 });
  }
}
