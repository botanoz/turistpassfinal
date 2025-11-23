import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: account, error } = await supabase
      .from("business_accounts")
      .select(
        `id, business_id, business_name, contact_name, contact_email, contact_phone, status, metadata, created_at, updated_at`,
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Business account fetch error:", error);
      throw error;
    }

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Business account not found" },
        { status: 404 },
      );
    }

    const supabaseAdmin = createAdminClient();
    let business: any = null;
    let businessId = account.business_id ?? null;

    if (businessId) {
      const { data: businessRow } = await supabaseAdmin
        .from("businesses")
        .select(
          "id, name, slug, category, status, description, short_description, address, latitude, longitude, email, contact_name, contact_email, contact_phone, contact_position, city, district, tax_number, registration_number, established, website, created_at, updated_at",
        )
        .eq("id", businessId)
        .maybeSingle();
      business = businessRow ?? null;
    }

    if (!businessId && account.contact_email) {
      const { data: lookupBusiness } = await supabaseAdmin
        .from("businesses")
        .select(
          "id, name, slug, category, status, description, short_description, address, latitude, longitude, email, contact_name, contact_email, contact_phone, contact_position, city, district, tax_number, registration_number, established, website, created_at, updated_at",
        )
        .eq("contact_email", account.contact_email)
        .maybeSingle();

      if (lookupBusiness) {
        business = lookupBusiness;
        businessId = lookupBusiness.id;

        const { error: linkError } = await supabase
          .from("business_accounts")
          .update({ business_id: lookupBusiness.id })
          .eq("id", user.id);

        if (linkError) {
          console.error("Failed to backfill business_id:", linkError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        business_id: businessId,
        business,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load business account",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      metadata,
      businessId,
    } = body;

    const payload: Record<string, any> = {
      id: user.id,
      business_name: businessName,
      contact_name: contactName,
      contact_email: contactEmail || user.email,
      contact_phone: contactPhone,
      metadata: metadata || {},
    };

    if (businessId) {
      payload.business_id = businessId;
    }

    const { data: account, error } = await supabase
      .from("business_accounts")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Business account upsert error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create business account" },
      { status: 500 }
    );
  }
}
