import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type ReviewPayload = {
  rating?: number;
  comment?: string;
};

const buildUserName = (first?: string | null, last?: string | null) => {
  const name = `${first || ''} ${last || ''}`.trim();
  return name || 'TuristPass User';
};

const getReviewStats = async (supabaseAdmin: ReturnType<typeof createAdminClient>, businessId: string) => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('business_id', businessId);

  if (error) {
    console.error('Error calculating review stats:', error);
    return { reviewCount: 0, averageRating: 0 };
  }

  const ratings = (data || []).map((r) => Number(r.rating || 0));
  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0 ? Number((ratings.reduce((sum, r) => sum + r, 0) / reviewCount).toFixed(1)) : 0;

  return { reviewCount, averageRating };
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await context.params;
    const body = (await request.json()) as ReviewPayload;
    const rating = Number(body.rating);
    const comment = (body.comment || '').trim();

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Missing business id' }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5 || !comment) {
      return NextResponse.json(
        { success: false, error: 'Rating (1-5) and comment are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id, created_at')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    let savedReview:
      | { id: string; business_id: string; user_id: string | null; rating: number; comment: string; created_at: string }
      | null
      | undefined;

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .update({ rating, comment })
        .eq('id', existing.id)
        .select('id, business_id, user_id, rating, comment, created_at')
        .maybeSingle();

      if (error) {
        console.error('Error updating review:', error);
        throw error;
      }

      savedReview = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .insert({ business_id: businessId, user_id: user.id, rating, comment })
        .select('id, business_id, user_id, rating, comment, created_at')
        .maybeSingle();

      if (error) {
        console.error('Error creating review:', error);
        throw error;
      }

      savedReview = data;
    }

    if (!savedReview) {
      return NextResponse.json({ success: false, error: 'Unable to save review' }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from('customer_profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    const { reviewCount, averageRating } = await getReviewStats(supabaseAdmin, businessId);

    return NextResponse.json({
      success: true,
      review: {
        id: savedReview.id,
        userId: savedReview.user_id,
        userName: buildUserName(profile?.first_name, profile?.last_name),
        userAvatar: profile?.avatar_url || '',
        rating: savedReview.rating,
        comment: savedReview.comment,
        date: savedReview.created_at,
      },
      reviewCount,
      averageRating,
    });
  } catch (error: any) {
    console.error('Review submit error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await context.params;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Missing business id' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { error: deleteError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('business_id', businessId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting review:', deleteError);
      throw deleteError;
    }

    const { reviewCount, averageRating } = await getReviewStats(supabaseAdmin, businessId);

    return NextResponse.json({ success: true, reviewCount, averageRating });
  } catch (error: any) {
    console.error('Review delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}
