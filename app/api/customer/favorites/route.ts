import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET customer favorites
export async function GET() {
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

    // Fetch favorites with pass details
    const { data: favorites, error: favoritesError } = await supabase
      .from('pass_favorites')
      .select(`
        id,
        pass_id,
        created_at,
        pass:passes(
          id,
          name,
          short_description,
          description,
          image_url,
          status,
          popular,
          pricing:pass_pricing(
            days,
            age_group,
            price
          ),
          businesses:pass_businesses(
            id,
            business:businesses(
              id,
              name,
              category
            )
          )
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError);
      throw favoritesError;
    }

    // Transform for frontend
    const transformedFavorites = (favorites || []).map(fav => ({
      id: fav.id,
      passId: fav.pass_id,
      pass: fav.pass,
      addedAt: fav.created_at
    }));

    return NextResponse.json({
      success: true,
      favorites: transformedFavorites
    });

  } catch (error: any) {
    console.error('Customer favorites API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch favorites'
    }, { status: 500 });
  }
}

// POST add favorite
export async function POST(request: Request) {
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
    const { passId } = body;

    if (!passId) {
      return NextResponse.json({
        success: false,
        error: 'Pass ID is required'
      }, { status: 400 });
    }

    // Add to favorites
    const { data: favorite, error: insertError } = await supabase
      .from('pass_favorites')
      .insert({
        customer_id: user.id,
        pass_id: passId
      })
      .select()
      .single();

    if (insertError) {
      // Check if already favorited
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({
          success: false,
          error: 'Pass is already in favorites'
        }, { status: 409 });
      }
      console.error('Error adding favorite:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Pass added to favorites',
      favorite
    });

  } catch (error: any) {
    console.error('Add favorite API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to add favorite'
    }, { status: 500 });
  }
}
