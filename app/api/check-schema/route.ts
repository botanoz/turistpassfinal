import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if pin_code column exists
    const { data, error } = await supabase
      .from('purchased_passes')
      .select('pin_code')
      .limit(1);

    if (error) {
      // Column doesn't exist, try to add it
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE purchased_passes
          ADD COLUMN IF NOT EXISTS pin_code TEXT;

          -- Notify PostgREST to reload schema
          NOTIFY pgrst, 'reload schema';
        `
      });

      if (alterError) {
        return NextResponse.json({
          success: false,
          error: error.message,
          alterError: alterError.message
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Column added and schema reloaded'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Column already exists'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
