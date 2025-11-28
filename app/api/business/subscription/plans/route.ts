import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get all available subscription plans
export async function GET() {
  try {
    const supabase = await createClient();

    // Get all active subscription plans
    const { data: plans, error } = await supabase
      .from('business_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      plans
    });

  } catch (error: any) {
    console.error('Get plans error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch plans'
    }, { status: 500 });
  }
}
