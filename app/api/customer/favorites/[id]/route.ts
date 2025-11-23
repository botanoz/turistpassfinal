import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE remove favorite by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const favoriteId = id;

    // Delete favorite (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from('pass_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('customer_id', user.id);

    if (deleteError) {
      console.error('Error deleting favorite:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Favorite removed successfully'
    });

  } catch (error: any) {
    console.error('Delete favorite API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to remove favorite'
    }, { status: 500 });
  }
}
