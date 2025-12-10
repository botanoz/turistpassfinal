import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET - Fetch all reviews for admin
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status'); // pending, approved, rejected
    const passId = searchParams.get('passId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('pass_reviews')
      .select(`
        *,
        customer_profiles:customer_id (
          id,
          first_name,
          last_name,
          email
        ),
        passes:pass_id (
          id,
          name,
          image_url
        ),
        orders:order_id (
          id,
          order_number,
          total_amount,
          currency
        ),
        admin_profiles:moderated_by (
          id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (passId) {
      query = query.eq('pass_id', passId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error: reviewsError, count } = await query;

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw reviewsError;
    }

    // Get review statistics
    const { data: stats } = await supabase
      .rpc('get_admin_review_stats');

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      stats: stats?.[0] || {
        total_reviews: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        rejected_reviews: 0,
        average_rating: 0
      },
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });

  } catch (error: any) {
    console.error('Admin reviews fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch reviews'
    }, { status: 500 });
  }
}

// PUT - Update review status (approve/reject)
export async function PUT(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { reviewId, status, adminNotes } = body;

    // Validate required fields
    if (!reviewId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status'
      }, { status: 400 });
    }

    // Get admin user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Update review
    const { data: review, error: updateError } = await supabase
      .from('pass_reviews')
      .update({
        status,
        admin_notes: adminNotes || null,
        moderated_by: user?.id || null,
        moderated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating review:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Review ${status} successfully`,
      review
    });

  } catch (error: any) {
    console.error('Review moderation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to moderate review'
    }, { status: 500 });
  }
}

// DELETE - Delete a review
export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({
        success: false,
        error: 'Review ID is required'
      }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('pass_reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      console.error('Error deleting review:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error: any) {
    console.error('Review deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete review'
    }, { status: 500 });
  }
}
