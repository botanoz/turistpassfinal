import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET customer profile
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Not logged in - return null profile without error
      return NextResponse.json({
        success: true,
        profile: null
      }, { status: 200 });
    }

    // Fetch customer profile
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // If profile doesn't exist, return null (not an error)
    if (profileError) {
      console.error('Error fetching customer profile:', profileError);
      return NextResponse.json({
        success: false,
        error: profileError.message
      }, { status: 500 });
    }

    if (!profile) {
      // Profile doesn't exist yet - this is normal for new users
      return NextResponse.json({
        success: true,
        profile: null
      }, { status: 200 });
    }

    // Get pass statistics
    const { data: passStats } = await supabase
      .from('purchased_passes')
      .select('id, status')
      .eq('customer_id', user.id);

    // Only count active and pending_activation passes (not expired, cancelled, or used)
    const totalPasses = passStats?.filter(p =>
      p.status === 'active' || p.status === 'pending_activation'
    ).length || 0;
    const activePasses = passStats?.filter(p => p.status === 'active').length || 0;

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        stats: {
          totalPasses,
          activePasses,
          totalSavings: profile?.total_savings || 0
        }
      }
    });

  } catch (error: any) {
    console.error('Customer profile API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch profile'
    }, { status: 500 });
  }
}

// PUT update customer profile
export async function PUT(request: Request) {
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

    const body = await request.json();
    const { first_name, last_name, phone, avatar_url, email } = body;

    let emailChangePending = false;

    const normalizedEmail = typeof email === 'string' ? email.trim() : undefined;
    const currentEmail = user.email || '';

    if (normalizedEmail && normalizedEmail.toLowerCase() !== currentEmail.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json({
          success: false,
          error: 'Please enter a valid email address'
        }, { status: 400 });
      }

      const { error: emailError, data: emailResult } = await supabase.auth.updateUser({ email: normalizedEmail });

      if (emailError) {
        console.error('Error updating auth email:', emailError);

        try {
          const adminClient = createAdminClient();
          const { error: adminEmailError } = await adminClient.auth.admin.updateUserById(user.id, {
            email: normalizedEmail,
            email_confirm: false
          });

          if (adminEmailError) {
            console.error('Admin email update failed:', adminEmailError);
            return NextResponse.json({
              success: false,
              error: adminEmailError.message || emailError.message || 'Failed to update email'
            }, { status: 400 });
          }
        } catch (adminErr: any) {
          console.error('Service role email update error:', adminErr);
          return NextResponse.json({
            success: false,
            error: emailError.message || 'Failed to update email'
          }, { status: 400 });
        }
      } else {
        emailChangePending = !!emailResult?.user && emailResult.user.email?.toLowerCase() !== normalizedEmail.toLowerCase();
      }
    }

    // Update customer profile
    const updatePayload: Record<string, any> = {
      first_name,
      last_name,
      phone,
      avatar_url,
      updated_at: new Date().toISOString()
    };

    if (normalizedEmail) {
      updatePayload.email = normalizedEmail;
    }

    const { data: profile, error: updateError } = await supabase
      .from('customer_profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer profile:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      emailChangePending,
      profile
    });

  } catch (error: any) {
    console.error('Customer profile update API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update profile'
    }, { status: 500 });
  }
}

// POST create customer profile
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      phone
    } = body;

    const insertPayload = {
      id: user.id,
      email: user.email,
      first_name,
      last_name,
      phone,
      status: 'active' as const
    };

    const { data: profile, error: insertError } = await supabase
      .from('customer_profiles')
      .upsert(insertPayload, { onConflict: 'id' })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating customer profile:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      profile
    });
  } catch (error: any) {
    console.error('Customer profile create API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create profile'
      },
      { status: 500 }
    );
  }
}
