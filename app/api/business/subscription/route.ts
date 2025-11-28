import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

// Get current business subscription details
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get business account
    const { data: businessAccount } = await supabase
      .from('business_accounts')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!businessAccount) {
      return NextResponse.json({ success: false, error: 'Business account not found' }, { status: 404 });
    }

    // Get subscription details using function
    const { data: subscriptionDetails, error: subError } = await supabase
      .rpc('get_business_subscription_details', {
        business_uuid: businessAccount.business_id
      })
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      // Return free plan if no subscription exists
      const { data: freePlan } = await supabase
        .from('business_subscription_plans')
        .select('*')
        .eq('plan_type', 'free')
        .single();

      return NextResponse.json({
        success: true,
        subscription: null,
        plan: freePlan,
        usage: {
          campaigns_created: 0,
          active_campaigns: 0,
          total_redemptions: 0,
          current_period_redemptions: 0
        },
        commission_summary: {
          pending_amount: 0,
          invoiced_amount: 0,
          paid_amount: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      ...(subscriptionDetails || {})
    });

  } catch (error: any) {
    console.error('Get subscription error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch subscription'
    }, { status: 500 });
  }
}

// Update subscription (upgrade/downgrade)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get business account
    const { data: businessAccount } = await supabase
      .from('business_accounts')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!businessAccount) {
      return NextResponse.json({ success: false, error: 'Business account not found' }, { status: 404 });
    }

    const body = await request.json();
    const { newPlanId, action } = body; // action: 'upgrade', 'downgrade', 'cancel'

    if (action === 'cancel') {
      // Cancel subscription
      const { data: currentSub } = await supabase
        .from('business_subscriptions')
        .select('id, plan_id')
        .eq('business_id', businessAccount.business_id)
        .in('status', ['active', 'trial'])
        .single();

      if (!currentSub) {
        return NextResponse.json({
          success: false,
          error: 'No active subscription found'
        }, { status: 404 });
      }

      const { error: cancelError } = await supabase
        .from('business_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          auto_renew: false
        })
        .eq('id', currentSub.id);

      if (cancelError) throw cancelError;

      // Log history
      await supabase
        .from('business_subscription_history')
        .insert({
          business_id: businessAccount.business_id,
          subscription_id: currentSub.id,
          event_type: 'cancelled',
          old_plan_id: currentSub.plan_id,
          old_status: 'active',
          new_status: 'cancelled',
          reason: 'Cancelled by business',
          initiated_by: 'business'
        });

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled'
      });
    }

    // For upgrade/downgrade
    if (!newPlanId) {
      return NextResponse.json({
        success: false,
        error: 'New plan ID required'
      }, { status: 400 });
    }

    // Get new plan details
    const { data: newPlan } = await supabase
      .from('business_subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (!newPlan) {
      return NextResponse.json({
        success: false,
        error: 'Plan not found'
      }, { status: 404 });
    }

    // Get current subscription
    const { data: currentSub } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessAccount.business_id)
      .in('status', ['active', 'trial'])
      .single();

    if (!currentSub) {
      // No active subscription - create a new one using admin client
      // Business users don't have INSERT permission on subscriptions
      const adminSupabase = createAdminClient();
      const now = new Date();
      let periodEnd = new Date(now);

      if (newPlan.billing_cycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (newPlan.billing_cycle === 'quarterly') {
        periodEnd.setMonth(periodEnd.getMonth() + 3);
      } else if (newPlan.billing_cycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const { data: newSub, error: createError } = await adminSupabase
        .from('business_subscriptions')
        .insert({
          business_id: businessAccount.business_id,
          plan_id: newPlanId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          price: newPlan.price,
          currency: newPlan.currency,
          commission_rate: newPlan.commission_rate || 0,
          transaction_fee: newPlan.transaction_fee || 0,
          auto_renew: true
        })
        .select()
        .single();

      if (createError) throw createError;

      // Log history using admin client
      await adminSupabase
        .from('business_subscription_history')
        .insert({
          business_id: businessAccount.business_id,
          subscription_id: newSub.id,
          event_type: 'created',
          new_plan_id: newPlanId,
          new_status: 'active',
          reason: 'Initial subscription created by business',
          initiated_by: 'business'
        });

      return NextResponse.json({
        success: true,
        message: 'Subscription created successfully'
      });
    }

    // Update existing subscription
    const { error: updateError } = await supabase
      .from('business_subscriptions')
      .update({
        plan_id: newPlanId,
        price: newPlan.price,
        currency: newPlan.currency,
        commission_rate: newPlan.commission_rate,
        transaction_fee: newPlan.transaction_fee,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSub.id);

    if (updateError) throw updateError;

    // Log history
    await supabase
      .from('business_subscription_history')
      .insert({
        business_id: businessAccount.business_id,
        subscription_id: currentSub.id,
        event_type: action === 'upgrade' ? 'upgraded' : 'downgraded',
        old_plan_id: currentSub.plan_id,
        new_plan_id: newPlanId,
        old_status: currentSub.status,
        new_status: currentSub.status,
        reason: `Plan ${action}d by business`,
        initiated_by: 'business'
      });

    return NextResponse.json({
      success: true,
      message: `Subscription ${action}d successfully`
    });

  } catch (error: any) {
    console.error('Update subscription error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update subscription'
    }, { status: 500 });
  }
}
