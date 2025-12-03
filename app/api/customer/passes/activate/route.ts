import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customerId = user.id;
    const body = await request.json();
    const { passId } = body;

    if (!passId) {
      return NextResponse.json(
        { success: false, error: 'Pass ID is required' },
        { status: 400 }
      );
    }

    // Call the database function to activate the pass
    const { data: result, error: activationError } = await supabase
      .rpc('activate_purchased_pass', {
        p_pass_id: passId,
        p_customer_id: customerId
      });

    if (activationError) {
      console.error('Pass activation error:', activationError);

      // Handle specific error cases
      if (activationError.message.includes('not found') || activationError.message.includes('does not belong')) {
        return NextResponse.json(
          { success: false, error: 'Pass not found or access denied' },
          { status: 404 }
        );
      }

      if (activationError.message.includes('cannot be activated')) {
        return NextResponse.json(
          { success: false, error: 'Pass cannot be activated. It may already be active or expired.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: activationError.message || 'Failed to activate pass' },
        { status: 500 }
      );
    }

    // Get the full pass details after activation
    const { data: activatedPass, error: fetchError } = await supabase
      .from('purchased_passes')
      .select(`
        *,
        passes:pass_id (
          id,
          name,
          description,
          price,
          original_price,
          duration_days,
          duration_hours
        )
      `)
      .eq('id', passId)
      .eq('customer_id', customerId)
      .single();

    if (fetchError || !activatedPass) {
      console.error('Error fetching activated pass:', fetchError);
      // Still return success since activation succeeded
      return NextResponse.json({
        success: true,
        message: 'Pass activated successfully',
        activation: result?.[0] || {}
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pass activated successfully! Your pass is now active.',
      pass: activatedPass,
      activation: result?.[0] || {}
    });

  } catch (error: any) {
    console.error('Pass activation API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
