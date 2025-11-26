import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch customer's favorite businesses
// NOTE: business_favorites table does not exist in database yet
// Returning empty array for now to prevent errors
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // TODO: Create business_favorites table in database
    // For now, return empty favorites
    return NextResponse.json({
      success: true,
      favorites: []
    });

  } catch (error: any) {
    console.error('Business favorites fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch favorites'
    }, { status: 500 });
  }
}

// POST - Add business to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 });
    }

    // Add to favorites
    const { data, error } = await supabase
      .from('business_favorites')
      .insert({
        customer_id: user.id,
        business_id: businessId
      })
      .select()
      .single();

    if (error) {
      // Check if already favorited
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'Business already in favorites'
        }, { status: 409 });
      }
      console.error('Error adding business favorite:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Business added to favorites',
      favorite: data
    });

  } catch (error: any) {
    console.error('Add business favorite error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to add favorite'
    }, { status: 500 });
  }
}

// DELETE - Remove business from favorites
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 });
    }

    // Remove from favorites
    const { error } = await supabase
      .from('business_favorites')
      .delete()
      .eq('customer_id', user.id)
      .eq('business_id', businessId);

    if (error) {
      console.error('Error removing business favorite:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites'
    });

  } catch (error: any) {
    console.error('Remove business favorite error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to remove favorite'
    }, { status: 500 });
  }
}
