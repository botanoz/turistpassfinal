import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup endpoint - creates test customer for order simulations
export async function POST() {
  try {
    // Use service role to create auth user
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

    const testEmail = 'test@example.com';
    const testPassword = 'Test123456!';

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === testEmail);

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      console.log('Test user already exists:', userId);
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'Customer'
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      userId = authData.user.id;
      console.log('Created test user:', userId);
    }

    // Check if customer profile exists
    const { data: existingProfile } = await supabase
      .from('customer_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Create customer profile
      const { error: profileError } = await supabase
        .from('customer_profiles')
        .insert({
          id: userId,
          email: testEmail,
          first_name: 'Test',
          last_name: 'Customer',
          phone: '+90 555 123 4567',
          status: 'active'
        });

      if (profileError) {
        console.error('Error creating customer profile:', profileError);
        throw profileError;
      }

      console.log('Created customer profile');
    }

    return NextResponse.json({
      success: true,
      message: 'Test customer created successfully',
      customer: {
        id: userId,
        email: testEmail,
        credentials: {
          email: testEmail,
          password: testPassword
        }
      }
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
