import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Check passes table
    const passesResult = await supabase
      .from('passes')
      .select('id, name, status', { count: 'exact' });

    // Check businesses table
    const businessesResult = await supabase
      .from('businesses')
      .select('id, name', { count: 'exact' })
      .limit(5);

    // Check pass_businesses junction table
    const junctionResult = await supabase
      .from('pass_businesses')
      .select('pass_id, business_id', { count: 'exact' })
      .limit(5);

    return NextResponse.json({
      passes: {
        count: passesResult.count,
        error: passesResult.error,
        sample: passesResult.data
      },
      businesses: {
        count: businessesResult.count,
        error: businessesResult.error,
        sample: businessesResult.data
      },
      pass_businesses: {
        count: junctionResult.count,
        error: junctionResult.error,
        sample: junctionResult.data
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
