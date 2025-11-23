import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Fetch purchased passes with pass details
    const { data: purchasedPasses, error: passesError } = await supabase
      .from('purchased_passes')
      .select(`
        id,
        pass_name,
        pass_type,
        activation_code,
        pin_code,
        expiry_date,
        status,
        usage_count,
        max_usage,
        created_at,
        order:orders(
          id,
          order_number,
          total_amount,
          created_at
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (passesError) {
      console.error('Error fetching purchased passes:', passesError);
      throw passesError;
    }

    // Transform passes for frontend
    const transformedPasses = (purchasedPasses || []).map(pass => {
      const now = new Date();
      const expiryDate = new Date(pass.expiry_date);
      const isExpired = expiryDate < now;
      const isMaxUsageReached = pass.max_usage && pass.usage_count >= pass.max_usage;

      return {
        id: pass.id,
        passId: pass.id,
        passName: pass.pass_name,
        passType: pass.pass_type,
        activationCode: pass.activation_code,
        pinCode: pass.pin_code,
        expiryDate: pass.expiry_date,
        status: isExpired || isMaxUsageReached ? 'expired' : pass.status,
        usageCount: pass.usage_count || 0,
        maxUsage: pass.max_usage,
        order: pass.order,
        purchasedAt: pass.created_at
      };
    });

    return NextResponse.json({
      success: true,
      passes: transformedPasses
    });

  } catch (error: any) {
    console.error('Customer passes API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch passes'
    }, { status: 500 });
  }
}
