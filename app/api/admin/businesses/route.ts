import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_STATUSES,
  normalizeBusinessCategory,
  normalizeBusinessStatus,
} from "@/lib/utils/businessCategories";

// GET /api/admin/businesses
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
      .from('businesses')
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

    const { data: businesses, error } = await query;

    if (error) {
      console.error('Businesses fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 });
    }

    // Enrich each business with pass count
    const businessesWithPassCount = await Promise.all(
      (businesses || []).map(async (business) => {
        // Get count of passes using this business
        const { count: passCount } = await supabase
          .from('pass_businesses')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        return {
          id: business.id,
          name: business.name,
          category: business.category,
          description: business.description,
          shortDescription: business.short_description,
          address: business.address,
          latitude: business.latitude,
          longitude: business.longitude,
          imageUrl: business.image_url,
          galleryImages: business.gallery_images || [],
          status: business.status,
          email: business.email,
          contact_name: business.contact_name,
          contact_email: business.contact_email,
          contact_phone: business.contact_phone,
          contact_position: business.contact_position,
          city: business.city,
          district: business.district,
          tax_number: business.tax_number,
          registration_number: business.registration_number,
          established: business.established,
          website: business.website,
          slug: business.slug,
          passCount: passCount || 0,
          createdAt: business.created_at,
          updatedAt: business.updated_at
        };
      })
    );

    // Get statistics
    const stats = {
      totalBusinesses: businessesWithPassCount.length,
      activeBusinesses: businessesWithPassCount.filter(b => b.status === 'active').length,
      pendingBusinesses: businessesWithPassCount.filter(b => b.status === 'pending').length,
      suspendedBusinesses: businessesWithPassCount.filter(b => ['suspended', 'inactive'].includes(b.status as string)).length,
      inactiveBusinesses: businessesWithPassCount.filter(b => b.status === 'inactive').length,
      totalScans: 0,
      byCategory: []
    };

    return NextResponse.json({
      businesses: businessesWithPassCount,
      stats,
      count: businessesWithPassCount.length
    });

  } catch (error) {
    console.error('Businesses API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/businesses - Create new business
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
      status,
      email,
      contactName,
      contactEmail,
      contactPhone,
      contactPosition,
      city,
      district,
      taxNumber,
      registrationNumber,
      established,
      website,
      slug
    } = body;

    const normalizedSlug =
      slug ?? (name ? name.toLowerCase().trim().replace(/\s+/g, "-") : null);

    // Validation
    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // Valid categories
    const normalizedCategory = normalizeBusinessCategory(category);
    if (!normalizedCategory) {
      return NextResponse.json(
        {
          error: `Category must be one of: ${BUSINESS_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Valid statuses
    const normalizedStatus = status ? normalizeBusinessStatus(status) : null;
    if (status && !normalizedStatus) {
      return NextResponse.json(
        {
          error: `Status must be one of: ${BUSINESS_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Insert business
    const { data: business, error: insertError } = await supabase
      .from('businesses')
      .insert({
        name,
        category: normalizedCategory,
        description: description || null,
        short_description: shortDescription || null,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        image_url: imageUrl || null,
        gallery_images: galleryImages || [],
        status: normalizedStatus || "active",
        email: email || null,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        contact_position: contactPosition || null,
        city: city || null,
        district: district || null,
        tax_number: taxNumber || null,
        registration_number: registrationNumber || null,
        established: established || null,
        website: website || null,
        slug: normalizedSlug
      })
      .select()
      .single();

    if (insertError) {
      console.error('Business insert error:', insertError);
      return NextResponse.json(
        { error: "Failed to create business" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'create_business',
      description: `Created business: ${name}`,
      metadata: { business_id: business.id, business_name: name }
    });

    return NextResponse.json(
      {
        success: true,
        business: {
          id: business.id,
          name: business.name
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Business creation error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




