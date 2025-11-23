import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lookup business_id for folder scoping
    const { data: account, error: accErr } = await supabase
      .from('business_accounts')
      .select('business_id')
      .eq('id', user.id)
      .maybeSingle();
    if (accErr) throw accErr;
    if (!account?.business_id) {
      return NextResponse.json({ error: 'Business not linked' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const bucket = 'business-images';
    const folder = account.business_id as string;

    // Basic validations
    const allowed = ['image/jpeg','image/png','image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop();
    const fileName = `${nanoid()}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({ success: true, url: publicUrl, path: filePath });
  } catch (error: any) {
    console.error('Business upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}


