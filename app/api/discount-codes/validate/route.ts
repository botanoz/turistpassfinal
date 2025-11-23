import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Validate discount code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { code, subtotal, pass_id } = body;

    // Validation
    if (!code || !subtotal) {
      return NextResponse.json(
        { error: "Missing required fields: code, subtotal" },
        { status: 400 }
      );
    }

    // Get current user (optional - can be null for guest checkout)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const customerId = user?.id || null;

    // Call the validation function
    const { data, error } = await supabase.rpc("validate_discount_code", {
      p_code: code,
      p_customer_id: customerId,
      p_subtotal: subtotal,
      p_pass_id: pass_id || null,
    });

    if (error) {
      console.error("Error validating discount code:", error);
      return NextResponse.json(
        { error: "Failed to validate discount code" },
        { status: 500 }
      );
    }

    // The function returns an array with one result
    const result = data && data.length > 0 ? data[0] : null;

    if (!result) {
      return NextResponse.json(
        { error: "Failed to validate discount code" },
        { status: 500 }
      );
    }

    if (!result.is_valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.error_message || "Invalid discount code",
        },
        { status: 200 }
      );
    }

    // Return validation result
    return NextResponse.json({
      valid: true,
      discountCodeId: result.discount_code_id,
      discountType: result.discount_type,
      discountValue: result.discount_value,
      discountAmount: result.discount_amount,
    });
  } catch (error) {
    console.error("Unexpected error in discount code validation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
