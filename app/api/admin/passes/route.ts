import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/passes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Build query
    let query = supabase
      .from('passes')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data: passes, error, count } = await query;

    if (error) {
      console.error('Passes fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch passes" }, { status: 500 });
    }

    // Enrich passes with pricing and business counts
    const enrichedPasses = await Promise.all(
      (passes || []).map(async (pass) => {
        // Get pricing options
        const { data: pricing } = await supabase
          .from('pass_pricing')
          .select('*')
          .eq('pass_id', pass.id)
          .order('days', { ascending: true });

        // Get business count
        const { count: businessCount } = await supabase
          .from('pass_businesses')
          .select('*', { count: 'exact', head: true })
          .eq('pass_id', pass.id);

        return {
          id: pass.id,
          name: pass.name,
          description: pass.description,
          shortDescription: pass.short_description,
          status: pass.status,
          featured: pass.featured,
          popular: pass.popular,
          features: pass.features || [],
          pricing: pricing || [],
          businesses: businessCount || 0,
          totalSold: pass.total_sold || 0,
          revenue: pass.total_revenue || 0,
          imageUrl: pass.image_url,
          createdAt: pass.created_at
        };
      })
    );

    // Get stats
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_admin_passes_stats');

    if (statsError) {
      console.error('Stats fetch error:', statsError);
    }

    const stats = statsData && statsData.length > 0 ? statsData[0] : {
      total_passes: 0,
      active_passes: 0,
      draft_passes: 0,
      total_sold: 0,
      total_revenue: 0
    };

    return NextResponse.json({
      passes: enrichedPasses,
      stats: {
        totalPasses: Number(stats.total_passes),
        active: Number(stats.active_passes),
        drafts: Number(stats.draft_passes),
        totalSold: Number(stats.total_sold),
        revenue: Number(stats.total_revenue)
      },
      count: count || 0
    });

  } catch (error) {
    console.error('Passes API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/passes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Validation
    if (!name || !description) {
      return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
    }

    if (!pricing || pricing.length === 0) {
      return NextResponse.json({ error: "At least one pricing option is required" }, { status: 400 });
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ error: "At least one business is required" }, { status: 400 });
    }

    // If this pass is marked as popular, clear existing popular flags first to keep only one
    if (popular === true) {
      await supabase.from('passes').update({ popular: false }).eq('popular', true);
    }

    // Create pass
    const { data: pass, error: passError } = await supabase
      .from('passes')
      .insert({
        name,
        description,
        short_description: shortDescription,
        status: status || 'draft',
        featured: featured || false,
        popular: popular || false,
        features: features || [],
        benefits: benefits || [],
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        about_content: aboutContent,
        cancellation_policy: cancellationPolicy,
        image_url: imageUrl
      })
      .select()
      .single();

    if (passError) {
      console.error('Pass creation error:', passError);
      return NextResponse.json({ error: "Failed to create pass" }, { status: 500 });
    }

    // Insert pricing options
    const pricingInserts = pricing.map((p: any) => ({
      pass_id: pass.id,
      days: p.days,
      age_group: p.ageGroup,
      price: p.price
    }));

    const { error: pricingError } = await supabase
      .from('pass_pricing')
      .insert(pricingInserts);

    if (pricingError) {
      console.error('Pricing insert error:', pricingError);
      // Rollback: Delete the pass
      await supabase.from('passes').delete().eq('id', pass.id);
      return NextResponse.json({ error: "Failed to add pricing options" }, { status: 500 });
    }

    // Insert business relationships
    const businessInserts = businesses.map((v: any) => ({
      pass_id: pass.id,
      business_id: v.businessId,
      discount: v.discount || 10,
      usage_type: v.usageType || 'once',
      max_usage: v.maxUsage
    }));

    const { error: businessesError } = await supabase
      .from('pass_businesses')
      .insert(businessInserts);

    if (businessesError) {
      console.error('Businesses insert error:', businessesError);
      // Rollback: Delete the pass (cascades to pricing)
      await supabase.from('passes').delete().eq('id', pass.id);
      return NextResponse.json({ error: "Failed to add businesses" }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'create_pass',
        description: `Created pass: ${name}`,
        category: 'passes',
        metadata: { passId: pass.id }
      });

    return NextResponse.json({
      success: true,
      pass: {
        id: pass.id,
        name: pass.name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Pass creation error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
