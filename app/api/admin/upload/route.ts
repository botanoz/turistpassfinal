import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

const VALID_BUCKETS = ['logos', 'banners', 'avatars', 'business-images'] as const;
type BucketName = typeof VALID_BUCKETS[number];

const MAX_FILE_SIZES: Record<BucketName, number> = {
  'logos': 5 * 1024 * 1024, // 5MB
  'banners': 10 * 1024 * 1024, // 10MB
  'avatars': 2 * 1024 * 1024, // 2MB
  'business-images': 10 * 1024 * 1024 // 10MB
};

const ALLOWED_MIME_TYPES: Record<BucketName, string[]> = {
  'logos': ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  'banners': ['image/jpeg', 'image/png', 'image/webp'],
  'avatars': ['image/jpeg', 'image/png', 'image/webp'],
  'business-images': ['image/jpeg', 'image/png', 'image/webp']
};

// POST /api/admin/upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as BucketName | null;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!bucket || !VALID_BUCKETS.includes(bucket)) {
      return NextResponse.json(
        { error: `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZES[bucket]) {
      return NextResponse.json(
        { error: `File too large. Maximum size for ${bucket}: ${MAX_FILE_SIZES[bucket] / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES[bucket].includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types for ${bucket}: ${ALLOWED_MIME_TYPES[bucket].join(', ')}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'file_upload',
        description: `Uploaded file to ${bucket}`,
        category: 'storage',
        metadata: {
          bucket,
          fileName: file.name,
          fileSize: file.size,
          filePath
        }
      });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
      bucket,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/upload (delete uploaded file)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { bucket, path } = body;

    if (!bucket || !VALID_BUCKETS.includes(bucket)) {
      return NextResponse.json(
        { error: `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!path) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete file", details: deleteError.message },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'file_delete',
        description: `Deleted file from ${bucket}`,
        category: 'storage',
        metadata: { bucket, path }
      });

    return NextResponse.json({ success: true, message: "File deleted successfully" });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
