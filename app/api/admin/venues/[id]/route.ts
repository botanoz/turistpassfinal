import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/venues/[id] - Get venue details
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

    // Get venue details with pass information using database function
    const { data: venueDetails, error: detailsError } = await supabase.rpc('get_venue_details', {
      venue_uuid: id
    });

    if (detailsError) {
      console.error('Venue details fetch error:', detailsError);
      return NextResponse.json({ error: "Failed to fetch venue details" }, { status: 500 });
    }

    if (!venueDetails || !venueDetails.venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ venue: venueDetails });

  } catch (error) {
    console.error('Venue details API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/venues/[id] - Update venue
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

    // Check if venue exists
    const { data: existingVenue, error: checkError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !existingVenue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Update venue
    const { data: updatedVenue, error: updateError } = await supabase
      .from('venues')
      .update({
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
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Venue update error:', updateError);
      return NextResponse.json(
        { error: "Failed to update venue" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'update_venue',
      description: `Updated venue: ${name}`,
      metadata: { venue_id: id, venue_name: name, previous_name: existingVenue.name }
    });

    return NextResponse.json({
      success: true,
      venue: {
        id: updatedVenue.id,
        name: updatedVenue.name
      }
    });

  } catch (error) {
    console.error('Venue update API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/venues/[id] - Delete venue
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

    // Check if venue exists
    const { data: existingVenue, error: checkError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !existingVenue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Check if venue can be safely deleted (not used in active passes)
    const { data: canDelete, error: canDeleteError } = await supabase.rpc('can_delete_venue', {
      venue_uuid: id
    });

    if (canDeleteError) {
      console.error('Can delete check error:', canDeleteError);
      return NextResponse.json(
        { error: "Failed to check venue dependencies" },
        { status: 500 }
      );
    }

    if (!canDelete) {
      return NextResponse.json(
        {
          error: "Cannot delete venue",
          message: "This venue is currently used in one or more active passes. Please remove it from all active passes before deleting, or set those passes to inactive/draft status."
        },
        { status: 400 }
      );
    }

    // Delete venue (this will cascade to pass_venues due to ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('venues')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Venue delete error:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete venue" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'delete_venue',
      description: `Deleted venue: ${existingVenue.name}`,
      metadata: { venue_id: id, venue_name: existingVenue.name }
    });

    return NextResponse.json({
      success: true,
      message: "Venue deleted successfully"
    });

  } catch (error) {
    console.error('Venue delete API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
