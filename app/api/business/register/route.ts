import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, categoryId, contact, location } = body;

    // Validate required fields
    if (!name || !email || !password || !categoryId || !contact?.phone || !location?.address || !location?.district) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Use service role client for admin operations (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(user => user.email === email);

    if (emailExists) {
      return NextResponse.json({
        success: false,
        error: 'Email already registered'
      }, { status: 400 });
    }

    // Check if email exists in businesses table
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('email', email)
      .single();

    if (existingBusiness) {
      return NextResponse.json({
        success: false,
        error: 'Email already registered'
      }, { status: 400 });
    }

    // Create auth user with business metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        account_type: 'business',
        business_name: name
      }
    });

    if (authError || !authData.user) {
      console.error('Auth creation error:', authError);
      return NextResponse.json({
        success: false,
        error: authError?.message || 'Failed to create account'
      }, { status: 500 });
    }

    // Create business record (using service role bypasses RLS)
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') + '-' + Date.now();

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name,
        slug,
        category: categoryId,
        email,
        contact_email: contact.email || email,
        contact_phone: contact.phone,
        address: location.address,
        district: location.district,
        city: 'Istanbul',
        latitude: location.coordinates?.lat || 0,
        longitude: location.coordinates?.lng || 0,
        status: 'pending'
      })
      .select()
      .single();

    if (businessError) {
      console.error('Business creation error:', businessError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({
        success: false,
        error: 'Failed to create business profile'
      }, { status: 500 });
    }

    // Create business account record
    const { error: accountError } = await supabaseAdmin
      .from('business_accounts')
      .insert({
        id: authData.user.id,
        business_id: business.id,
        business_name: name,
        contact_name: name,
        contact_email: email,
        contact_phone: contact.phone,
        status: 'pending',
        metadata: {
          business_id: business.id,
          slug: business.slug
        }
      });

    if (accountError) {
      console.error('Business account creation error:', accountError);
      // Continue anyway, can be fixed later
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error: any) {
    console.error('Business registration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Registration failed'
    }, { status: 500 });
  }
}
