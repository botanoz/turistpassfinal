import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get business_id for this user
    const { data: account, error: accountError } = await supabase
      .from("business_accounts")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (accountError) {
      console.error("Reviews account lookup error:", accountError);
      throw accountError;
    }

    if (!account?.business_id) {
      return NextResponse.json({ success: true, reviews: [] });
    }

    // Fetch reviews for this business
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, business_id, user_id, rating, comment, created_at")
      .eq("business_id", account.business_id)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError);
      throw reviewsError;
    }

    const reviewIds = (reviews ?? []).map((r) => r.id);
    let repliesByReview: Record<string, any[]> = {};
    if (reviewIds.length > 0) {
      const { data: replies, error: repliesError } = await supabase
        .from("review_replies")
        .select("id, review_id, replied_by, text, created_at")
        .in("review_id", reviewIds)
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Review replies fetch error:", repliesError);
        throw repliesError;
      }

      repliesByReview = (replies ?? []).reduce<Record<string, any[]>>((acc, r) => {
        (acc[r.review_id] ||= []).push(r);
        return acc;
      }, {});
    }

    return NextResponse.json({
      success: true,
      reviews: (reviews ?? []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        reply: (repliesByReview[r.id]?.slice(-1)[0] ?? null) && {
          text: repliesByReview[r.id].slice(-1)[0].text,
          date: repliesByReview[r.id].slice(-1)[0].created_at,
        },
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to load reviews" },
      { status: 500 },
    );
  }
}


