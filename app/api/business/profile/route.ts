import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type ProfilePayload = {
  description?: string | null;
  shortDescription?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  website?: string | null;
  metadata?: Record<string, any>;
};

async function getBusinessContext(userId: string) {
  const supabaseAdmin = createAdminClient();

  const { data: account, error: accountError } = await supabaseAdmin
    .from("business_accounts")
    .select(
      `
        id,
        business_id,
        business_name,
        contact_name,
        contact_email,
        contact_phone,
        status,
        metadata,
        business:businesses(
          id,
          name,
          slug,
          category,
          status,
          description,
          short_description,
          address,
          latitude,
          longitude,
          email,
          contact_name,
          contact_email,
          contact_phone,
          contact_position,
          city,
          district,
          tax_number,
          registration_number,
          established,
          website,
          created_at,
          updated_at
        )
      `,
    )
    .eq("id", userId)
    .maybeSingle();

  if (accountError) {
    throw accountError;
  }

  if (!account?.business_id) {
    throw new Error("Business profile is not linked yet.");
  }

  return { account, supabaseAdmin };
}

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
        { status: 401 },
      );
    }

    const { account } = await getBusinessContext(user.id);

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        business_id: account.business_id,
        business_name: account.business_name,
        contact_name: account.contact_name,
        contact_email: account.contact_email,
        contact_phone: account.contact_phone,
        status: account.status,
        metadata: account.metadata ?? {},
      },
      business: account.business,
    });
  } catch (error: any) {
    console.error("Business profile fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Failed to load profile",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as ProfilePayload;
    const { account, supabaseAdmin } = await getBusinessContext(user.id);
    const businessId = account.business_id;

    const businessUpdates: Record<string, any> = {};

    if (payload.description !== undefined) {
      businessUpdates.description = payload.description;
    }
    if (payload.shortDescription !== undefined) {
      businessUpdates.short_description = payload.shortDescription;
    }
    if (payload.contactName !== undefined) {
      businessUpdates.contact_name = payload.contactName;
    }
    if (payload.contactEmail !== undefined) {
      businessUpdates.contact_email = payload.contactEmail;
    }
    if (payload.contactPhone !== undefined) {
      businessUpdates.contact_phone = payload.contactPhone;
    }
    if (payload.address !== undefined) {
      businessUpdates.address = payload.address;
    }
    if (payload.city !== undefined) {
      businessUpdates.city = payload.city;
    }
    if (payload.district !== undefined) {
      businessUpdates.district = payload.district;
    }
    if (payload.website !== undefined) {
      businessUpdates.website = payload.website;
    }

    if (Object.keys(businessUpdates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("businesses")
        .update({
          ...businessUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (updateError) {
        throw updateError;
      }
    }

    if (payload.metadata !== undefined) {
      const nextMetadata = {
        ...(account.metadata ?? {}),
        profile: {
          ...(account.metadata?.profile ?? {}),
          ...payload.metadata,
        },
      };

      const { error: metadataError } = await supabaseAdmin
        .from("business_accounts")
        .update({
          metadata: nextMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (metadataError) {
        throw metadataError;
      }
    }

    const { account: refreshedAccount } = await getBusinessContext(user.id);

    return NextResponse.json({
      success: true,
      account: {
        id: refreshedAccount.id,
        business_id: refreshedAccount.business_id,
        business_name: refreshedAccount.business_name,
        contact_name: refreshedAccount.contact_name,
        contact_email: refreshedAccount.contact_email,
        contact_phone: refreshedAccount.contact_phone,
        status: refreshedAccount.status,
        metadata: refreshedAccount.metadata ?? {},
      },
      business: refreshedAccount.business,
    });
  } catch (error: any) {
    console.error("Business profile update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Failed to update profile",
      },
      { status: 500 },
    );
  }
}
