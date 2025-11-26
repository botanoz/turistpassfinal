import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get all active currencies (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all active currencies using the helper function
    const { data, error } = await supabase.rpc('get_active_currencies');

    if (error) throw error;

    return NextResponse.json({ currencies: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching active currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
}
