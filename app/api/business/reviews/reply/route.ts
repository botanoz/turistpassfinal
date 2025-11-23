import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, text } = body as { reviewId?: string; text?: string };

    if (!reviewId || !text?.trim()) {
      return NextResponse.json({ success: false, error: "Missing reviewId or text" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("review_replies")
      .insert({ review_id: reviewId, replied_by: user.id, text: text.trim() });

    if (insertError) {
      console.error("Reply insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to send reply" },
      { status: 500 },
    );
  }
}


