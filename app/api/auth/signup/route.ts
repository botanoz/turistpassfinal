import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizeBusinessCategory } from "@/lib/utils/businessCategories";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

const generateBusinessSlug = (name: string) => {
  const base = slugify(name);
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(-8);
  return base ? `${base}-${suffix}` : suffix;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountType,
      email,
      password,
      firstName,
      lastName,
      businessName,
      businessCategory,
      contactPhone,
      subscribeNewsletter,
    } = body as {
      accountType: "customer" | "business";
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      businessName?: string;
      businessCategory?: string;
      contactPhone?: string;
      subscribeNewsletter?: boolean;
    };

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (accountType === "business" && !businessName) {
      return NextResponse.json(
        { success: false, error: "Business name is required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    // Create auth user with email confirmed
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        account_type: accountType,
        business_name: businessName,
      },
    });

    if (authError) {
      console.error("Signup admin create user error:", authError);
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 },
      );
    }

    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Failed to create user" },
        { status: 500 },
      );
    }

    if (accountType === "business") {
      const normalizedBusinessName = businessName?.trim();

      if (!normalizedBusinessName) {
        return NextResponse.json(
          { success: false, error: "Business name is required" },
          { status: 400 },
        );
      }

      const contactName = `${firstName} ${lastName}`.trim() || null;
      const normalizedBusinessCategory =
        normalizeBusinessCategory(businessCategory) || "Restaurant";
      const requestedCategory =
        businessCategory?.trim() && businessCategory.trim().length > 0
          ? businessCategory.trim()
          : null;

      const {
        data: existingBusiness,
        error: existingBusinessError,
      } = await supabaseAdmin
        .from("businesses")
        .select("id, slug")
        .eq("contact_email", email)
        .maybeSingle();

      if (existingBusinessError) {
        console.error("Signup business lookup error:", existingBusinessError);
        return NextResponse.json(
          { success: false, error: existingBusinessError.message },
          { status: 500 },
        );
      }

      let businessId = existingBusiness?.id ?? null;
      let businessSlug = existingBusiness?.slug ?? null;

      if (!businessId) {
        const generatedSlug = generateBusinessSlug(normalizedBusinessName);

        const {
          data: insertedBusiness,
          error: businessInsertError,
        } = await supabaseAdmin
          .from("businesses")
          .insert({
            name: normalizedBusinessName,
            slug: generatedSlug,
            status: "pending",
            category: normalizedBusinessCategory,
            email,
            contact_name: contactName,
            contact_email: email,
            contact_phone: contactPhone?.trim() || null,
            description: "Business profile pending completion",
            short_description: "Business profile pending completion",
          })
          .select("id, slug")
          .single();

        if (businessInsertError) {
          console.error("Signup businesses insert error:", businessInsertError);
          return NextResponse.json(
            { success: false, error: businessInsertError.message },
            { status: 500 },
          );
        }

        businessId = insertedBusiness?.id ?? null;
        businessSlug = insertedBusiness?.slug ?? generatedSlug;
      }

      if (!businessId) {
        console.error("Signup business insert error: missing business id");
        return NextResponse.json(
          { success: false, error: "Failed to create business record" },
          { status: 500 },
        );
      }

      const { error: businessAccountError } = await supabaseAdmin
        .from("business_accounts")
        .upsert({
          id: userId,
          business_id: businessId,
          business_name: normalizedBusinessName,
          contact_name: contactName,
          contact_email: email,
          contact_phone: contactPhone?.trim() || null,
          status: "pending",
          metadata: {
            category: normalizedBusinessCategory,
            requested_category: requestedCategory,
            newsletter: Boolean(subscribeNewsletter),
            business_id: businessId,
            slug: businessSlug,
          },
        });

      if (businessAccountError) {
        console.error("Signup business account insert error:", businessAccountError);
        return NextResponse.json(
          { success: false, error: businessAccountError.message },
          { status: 500 },
        );
      }
    } else {
      // Customer profile is automatically created by database trigger
      // No need to manually insert here
      // The trigger (handle_new_user) creates the profile when auth.users record is inserted
    }

    return NextResponse.json({
      success: true,
      userId,
      accountType,
    });
  } catch (error: any) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sign up" },
      { status: 500 },
    );
  }
}
