import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET - List all subscription plans
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: plans, error } = await supabase
      .from('business_subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      plans
    });

  } catch (error: any) {
    console.error('Get subscription plans error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch subscription plans'
    }, { status: 500 });
  }
}

// POST - Create new subscription plan
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    // Generate slug from name
    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Determine plan type based on price
    let planType = 'custom';
    if (body.price === 0) planType = 'free';
    else if (body.price < 500) planType = 'starter';
    else if (body.price < 2000) planType = 'professional';
    else planType = 'enterprise';

    const { data: plan, error } = await supabase
      .from('business_subscription_plans')
      .insert({
        name: body.name,
        slug: slug,
        description: body.description,
        plan_type: planType,
        price: body.price,
        billing_cycle: body.billing_period,
        currency: body.currency,
        features: body.features,
        limits: body.limits,
        is_active: body.is_active ?? true,
        trial_days: body.trial_days ?? 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      plan
    });

  } catch (error: any) {
    console.error('Create subscription plan error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create subscription plan'
    }, { status: 500 });
  }
}
