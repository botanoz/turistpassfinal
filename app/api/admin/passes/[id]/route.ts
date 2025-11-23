import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/passes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Get pass details using helper function
    const { data: passDetails, error: detailsError } = await supabase
      .rpc('get_pass_details', { pass_uuid: id });

    if (detailsError || !passDetails) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    return NextResponse.json({ pass: passDetails });

  } catch (error) {
    console.error('Pass fetch error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/passes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      shortDescription,
      status,
      featured,
      popular,
      features,
      benefits,
      heroTitle,
      heroSubtitle,
      aboutContent,
      cancellationPolicy,
      imageUrl,
      pricing, // Array of { days, ageGroup, price }
      businesses // Array of { businessId, discount, usageType, maxUsage }
    } = body;

    // If setting this pass as popular, clear popular flag on all others first
    if (popular === true) {
      await supabase
        .from('passes')
        .update({ popular: false })
        .eq('popular', true)
        .neq('id', id);
    }

    // Update pass
    const { data: pass, error: passError } = await supabase
      .from('passes')
      .update({
        name,
        description,
        short_description: shortDescription,
        status,
        featured,
        popular,
        features,
        benefits,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        about_content: aboutContent,
        cancellation_policy: cancellationPolicy,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (passError) {
      console.error('Pass update error:', passError);
      return NextResponse.json({ error: "Failed to update pass" }, { status: 500 });
    }

    // Update pricing: Delete and re-insert
    if (pricing) {
      // Delete existing pricing
      await supabase
        .from('pass_pricing')
        .delete()
        .eq('pass_id', id);

      // Insert new pricing
      const pricingInserts = pricing.map((p: any) => ({
        pass_id: id,
        days: p.days,
        age_group: p.ageGroup,
        price: p.price
      }));

      const { error: pricingError } = await supabase
        .from('pass_pricing')
        .insert(pricingInserts);

      if (pricingError) {
        console.error('Pricing update error:', pricingError);
      }
    }

    // Update businesses: Delete and re-insert
    if (businesses) {
      // Delete existing businesses
      await supabase
        .from('pass_businesses')
        .delete()
        .eq('pass_id', id);

      // Insert new businesses
      const businessInserts = businesses.map((v: any) => ({
        pass_id: id,
        business_id: v.businessId,
        discount: v.discount || 10,
        usage_type: v.usageType || 'once',
        max_usage: v.maxUsage
      }));

      const { error: businessesError } = await supabase
        .from('pass_businesses')
        .insert(businessInserts);

      if (businessesError) {
        console.error('Businesses update error:', businessesError);
      }
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'update_pass',
        description: `Updated pass: ${name}`,
        category: 'passes',
        metadata: { passId: id }
      });

    return NextResponse.json({
      success: true,
      pass: {
        id: pass.id,
        name: pass.name
      }
    });

  } catch (error) {
    console.error('Pass update error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/passes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Get pass name for logging
    const { data: pass } = await supabase
      .from('passes')
      .select('name')
      .eq('id', id)
      .single();

    // Delete pass (cascades to pricing and businesses)
    const { error: deleteError } = await supabase
      .from('passes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Pass delete error:', deleteError);
      return NextResponse.json({ error: "Failed to delete pass" }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'delete_pass',
        description: `Deleted pass: ${pass?.name || 'Unknown'}`,
        category: 'passes',
        metadata: { passId: id }
      });

    return NextResponse.json({
      success: true,
      message: "Pass deleted successfully"
    });

  } catch (error) {
    console.error('Pass delete error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
