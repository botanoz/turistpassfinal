import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/venues
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
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || 'all';

    // Build query
    let query = supabase
      .from('venues')
      .select('*');

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%,address.ilike.%${search}%`);
    }

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: venues, error } = await query;

    if (error) {
      console.error('Venues fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch venues" }, { status: 500 });
    }

    // Enrich each venue with pass count
    const venuesWithPassCount = await Promise.all(
      (venues || []).map(async (venue) => {
        // Get count of passes using this venue
        const { count: passCount } = await supabase
          .from('pass_venues')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', venue.id);

        return {
          id: venue.id,
          name: venue.name,
          category: venue.category,
          description: venue.description,
          shortDescription: venue.short_description,
          address: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
          imageUrl: venue.image_url,
          galleryImages: venue.gallery_images || [],
          status: venue.status,
          passCount: passCount || 0,
          createdAt: venue.created_at,
          updatedAt: venue.updated_at
        };
      })
    );

    // Get statistics
    const { data: statsData, error: statsError } = await supabase.rpc('get_admin_venues_stats');

    if (statsError) {
      console.error('Stats fetch error:', statsError);
    }

    const stats = statsData?.[0] || {
      total_venues: 0,
      active_venues: 0,
      inactive_venues: 0,
      by_category: []
    };

    return NextResponse.json({
      venues: venuesWithPassCount,
      stats: {
        totalVenues: Number(stats.total_venues || 0),
        activeVenues: Number(stats.active_venues || 0),
        inactiveVenues: Number(stats.inactive_venues || 0),
        byCategory: stats.by_category || []
      },
      count: venuesWithPassCount.length
    });

  } catch (error) {
    console.error('Venues API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/venues - Create new venue
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
      category,
      description,
      shortDescription,
      address,
      latitude,
      longitude,
      imageUrl,
      galleryImages,
      status
    } = body;

    // Validation
    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // Valid categories
    const validCategories = ['Historical', 'Restaurant', 'Museum', 'Shopping'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Valid statuses
    const validStatuses = ['active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert venue
    const { data: venue, error: insertError } = await supabase
      .from('venues')
      .insert({
        name,
        category,
        description: description || null,
        short_description: shortDescription || null,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        image_url: imageUrl || null,
        gallery_images: galleryImages || [],
        status: status || 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Venue insert error:', insertError);
      return NextResponse.json(
        { error: "Failed to create venue" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'create_venue',
      description: `Created venue: ${name}`,
      metadata: { venue_id: venue.id, venue_name: name }
    });

    return NextResponse.json(
      {
        success: true,
        venue: {
          id: venue.id,
          name: venue.name
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Venue creation error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
