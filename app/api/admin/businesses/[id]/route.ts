import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_STATUSES,
  normalizeBusinessCategory,
  normalizeBusinessStatus,
} from "@/lib/utils/businessCategories";

// GET /api/admin/businesses/[id] - Get business details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Get pass relationships
    const { data: passRelationships, error: passError } = await supabase
      .from('pass_businesses')
      .select(`
        id,
        discount,
        usage_type,
        max_usage,
        passes (
          id,
          name,
          status
        )
      `)
      .eq('business_id', id);

    return NextResponse.json({
      business: {
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
        createdAt: business.created_at,
        updatedAt: business.updated_at
      },
      passes: passRelationships || []
    });

  } catch (error) {
    console.error('Business details API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/businesses/[id] - Update business
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if business exists
    const { data: existingBusiness, error: checkError } = await supabase
      .from('businesses')
      .select('id, name, email, contact_name, contact_email, contact_phone, contact_position, city, district, tax_number, registration_number, established, website, slug, status')
      .eq('id', id)
      .single();

    if (checkError || !existingBusiness) {
      console.error('Business lookup error:', checkError);
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const normalizedSlug = slug ?? (name ? name.toLowerCase().trim().replace(/\s+/g, "-") : existingBusiness.slug ?? null);

    // Update business
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update({
        name,
        category: normalizedCategory,
        description: description || null,
        short_description: shortDescription || null,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        image_url: imageUrl || null,
        gallery_images: galleryImages || [],
        status: normalizedStatus || existingBusiness.status || "active",
        email: email || existingBusiness.email,
        contact_name: contactName || existingBusiness.contact_name,
        contact_email: contactEmail || existingBusiness.contact_email,
        contact_phone: contactPhone || existingBusiness.contact_phone,
        contact_position: contactPosition || existingBusiness.contact_position,
        city: city || existingBusiness.city,
        district: district || existingBusiness.district,
        tax_number: taxNumber || existingBusiness.tax_number,
        registration_number: registrationNumber || existingBusiness.registration_number,
        established: established || existingBusiness.established,
        website: website || existingBusiness.website,
        slug: normalizedSlug
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Business update error:', updateError);
      return NextResponse.json(
        { error: "Failed to update business" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'update_business',
      description: `Updated business: ${name}`,
      metadata: { business_id: id, business_name: name, previous_name: existingBusiness.name }
    });

    return NextResponse.json({
      success: true,
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name
      }
    });

  } catch (error) {
    console.error('Business update API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/businesses/[id] - Delete business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if business exists
    const { data: existingBusiness, error: checkError } = await supabase
      .from('businesses')
      .select('id, name, email, contact_name, contact_email, contact_phone, contact_position, city, district, tax_number, registration_number, established, website, slug')
      .eq('id', id)
      .single();

    if (checkError || !existingBusiness) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Check if business is used in active passes
    const { data: activePassUse, error: activePassError } = await supabase
      .from('pass_businesses')
      .select(`
        passes!inner (
          status
        )
      `)
      .eq('business_id', id)
      .eq('passes.status', 'active');

    if (activePassError) {
      console.error('Active pass check error:', activePassError);
    }

    if (activePassUse && activePassUse.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete business",
          message: "This business is currently used in one or more active passes. Please remove it from all active passes before deleting, or set those passes to inactive/draft status."
        },
        { status: 400 }
      );
    }

    // Delete business (this will cascade to pass_businesses due to ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Business delete error:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete business" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'delete_business',
      description: `Deleted business: ${existingBusiness.name}`,
      metadata: { business_id: id, business_name: existingBusiness.name }
    });

    return NextResponse.json({
      success: true,
      message: "Business deleted successfully"
    });

  } catch (error) {
    console.error('Business delete API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




