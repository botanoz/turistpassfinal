import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

// GET - Fetch customer's own reviews
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Fetch customer's reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('pass_reviews')
      .select(`
        *,
        passes:pass_id (
          id,
          name,
          image_url
        ),
        orders:order_id (
          id,
          order_number,
          created_at
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw reviewsError;
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || []
    });

  } catch (error: any) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch reviews'
    }, { status: 500 });
  }
}

// POST - Create a new review
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, passId, rating, title, comment, images } = body;

    // Validate required fields
    if (!orderId || !passId || !rating || !title || !comment) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }

    // Check if customer can review this order
    const { data: canReview } = await serviceSupabase
      .rpc('can_customer_review_order', {
        p_customer_id: user.id,
        p_order_id: orderId
      });

    if (!canReview) {
      return NextResponse.json({
        success: false,
        error: 'You cannot review this order. The order must be completed and not already reviewed.'
      }, { status: 400 });
    }

    // Get purchased pass id if available
    const { data: purchasedPass } = await serviceSupabase
      .from('purchased_passes')
      .select('id')
      .eq('order_id', orderId)
      .eq('pass_id', passId)
      .maybeSingle();

    // Create review
    const { data: review, error: reviewError } = await serviceSupabase
      .from('pass_reviews')
      .insert({
        customer_id: user.id,
        order_id: orderId,
        pass_id: passId,
        purchased_pass_id: purchasedPass?.id || null,
        rating,
        title,
        comment,
        images: images || [],
        status: 'pending' // Reviews need admin approval
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      throw reviewError;
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully. It will be visible after admin approval.',
      review
    });

  } catch (error: any) {
    console.error('Review creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create review'
    }, { status: 500 });
  }
}

// PUT - Update an existing review (only pending reviews)
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, rating, title, comment, images } = body;

    // Validate required fields
    if (!reviewId || !rating || !title || !comment) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }

    // Update review (RLS policy ensures only owner can update pending reviews)
    const { data: review, error: updateError } = await serviceSupabase
      .from('pass_reviews')
      .update({
        rating,
        title,
        comment,
        images: images || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('customer_id', user.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError) {
      console.error('Error updating review:', updateError);
      throw updateError;
    }

    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found or cannot be updated'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      review
    });

  } catch (error: any) {
    console.error('Review update error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update review'
    }, { status: 500 });
  }
}
