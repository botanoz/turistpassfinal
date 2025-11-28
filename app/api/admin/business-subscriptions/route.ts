import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const planId = searchParams.get('plan_id');
    const businessId = searchParams.get('business_id');

    // Build query
    let query = supabase
      .from('business_subscriptions')
      .select(`
        *,
        business:businesses!business_subscriptions_business_id_fkey(
          id,
          name,
          email,
          status
        ),
        plan:business_subscription_plans!business_subscriptions_plan_id_fkey(
          id,
          name,
          slug,
          plan_type,
          price,
          currency
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (planId) {
      query = query.eq('plan_id', planId);
    }
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    // Get summary stats
    const { data: stats } = await supabase.rpc('get_subscription_stats');

    return NextResponse.json({
      success: true,
      subscriptions,
      stats
    });

  } catch (error: any) {
    console.error('Admin subscriptions API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch subscriptions'
    }, { status: 500 });
  }
}

// Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    // Support both camelCase and snake_case for compatibility
    const businessId = body.businessId || body.business_id;
    const planId = body.planId || body.plan_id;
    const trialDays = body.trialDays !== undefined ? body.trialDays : body.trial_days;
    const autoRenew = body.autoRenew !== undefined ? body.autoRenew : body.auto_renew;

    // Validate required fields
    if (!businessId || !planId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: business_id and plan_id are required'
      }, { status: 400 });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('business_subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({
        success: false,
        error: 'Plan not found'
      }, { status: 404 });
    }

    // Calculate subscription dates
    const now = new Date();
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

    let periodEnd = new Date(now);
    if (plan.billing_cycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (plan.billing_cycle === 'quarterly') {
      periodEnd.setMonth(periodEnd.getMonth() + 3);
    } else if (plan.billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Check if business already has active subscription
    const { data: existing } = await supabase
      .from('business_subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .in('status', ['active', 'trial'])
      .single();

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Business already has an active subscription'
      }, { status: 400 });
    }

    // Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('business_subscriptions')
      .insert({
        business_id: businessId,
        plan_id: planId,
        status: trialDays > 0 ? 'trial' : 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_start: trialDays > 0 ? now.toISOString() : null,
        trial_end: trialEnd ? trialEnd.toISOString() : null,
        price: plan.price,
        currency: plan.currency,
        commission_rate: plan.commission_rate,
        transaction_fee: plan.transaction_fee,
        auto_renew: autoRenew !== false
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      throw subError;
    }

    // Log subscription history
    await supabase
      .from('business_subscription_history')
      .insert({
        business_id: businessId,
        subscription_id: subscription.id,
        event_type: 'created',
        new_plan_id: planId,
        new_status: subscription.status,
        reason: 'Created by admin',
        initiated_by: 'admin',
        admin_id: user.id
      });

    return NextResponse.json({
      success: true,
      subscription
    });

  } catch (error: any) {
    console.error('Create subscription error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create subscription'
    }, { status: 500 });
  }
}
