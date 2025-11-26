import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('=== Test Supabase Connection ===');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

    const supabase = createAdminClient();
    console.log('Client created');

    // Test simple query
    const { data, error } = await supabase
      .from('passes')
      .select('id, name, status')
      .limit(5);

    console.log('Query result:', { data, error });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        env: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
    }

    return NextResponse.json({
      success: true,
      passesCount: data?.length || 0,
      passes: data,
      env: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
