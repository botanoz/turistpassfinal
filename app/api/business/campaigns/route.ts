import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SubscriptionLimitCheck {
  allowed: boolean;
  reason?: string;
  current_count?: number;
  limit?: number;
}

// Get business campaigns
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

    // Get campaigns
    const { data: campaigns, error } = await supabase
      .from('business_campaigns')
      .select('*')
      .eq('business_id', businessAccount.business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      campaigns
    });

  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch campaigns'
    }, { status: 500 });
  }
}

// Create new campaign
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!body.title || !body.campaign_type || !body.start_date || !body.end_date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Check subscription limits
    const { data: limitCheck } = await supabase
      .rpc('check_subscription_limit', {
        business_uuid: businessAccount.business_id,
        limit_type: 'campaigns'
      })
      .single() as { data: SubscriptionLimitCheck | null };

    if (!limitCheck?.allowed) {
      return NextResponse.json({
        success: false,
        error: limitCheck?.reason || 'Campaign limit reached. Please upgrade your subscription.'
      }, { status: 403 });
    }

    // Determine campaign status based on start_date
    // Auto-activation trigger will handle the actual activation
    const now = new Date();
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);

    let initialStatus = 'pending';
    if (endDate < now) {
      // Campaign end date has passed
      initialStatus = 'completed';
    } else if (startDate <= now) {
      // Campaign should be active now
      initialStatus = 'active';
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('business_campaigns')
      .insert({
        business_id: businessAccount.business_id,
        title: body.title,
        description: body.description,
        campaign_type: body.campaign_type,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        minimum_purchase_amount: body.minimum_purchase_amount || 0,
        maximum_discount_amount: body.maximum_discount_amount,
        offer_details: body.offer_details,
        target_pass_types: body.target_pass_types,
        target_customer_segments: body.target_customer_segments,
        start_date: body.start_date,
        end_date: body.end_date,
        active_hours: body.active_hours,
        total_budget: body.total_budget,
        max_redemptions: body.max_redemptions,
        max_redemptions_per_customer: body.max_redemptions_per_customer || 1,
        status: initialStatus,
        admin_approved: true, // Businesses have full control over their campaigns
        visibility: body.visibility || 'public',
        image_url: body.image_url,
        banner_url: body.banner_url,
        terms_and_conditions: body.terms_and_conditions,
        promo_code: body.promo_code
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      throw campaignError;
    }

    // Determine success message based on status
    let message = 'Campaign created successfully';
    if (initialStatus === 'active') {
      message = 'Campaign created and activated successfully';
    } else if (initialStatus === 'pending') {
      message = `Campaign created successfully. It will activate on ${new Date(body.start_date).toLocaleDateString('tr-TR')}`;
    } else if (initialStatus === 'completed') {
      message = 'Campaign created but end date has already passed';
    }

    return NextResponse.json({
      success: true,
      campaign,
      message
    });

  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create campaign'
    }, { status: 500 });
  }
}
