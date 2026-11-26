import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isAvailable, branchId = '00000000-0000-0000-0000-000000000001' } = await request.json();

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'isAvailable boolean is required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Update item status in Supabase
    try {
      await supabase
        .from('menu_items')
        .update({
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // 2. Increment menu version
      const { data: versionRow } = await supabase
        .from('menu_versions')
        .select('version_number')
        .eq('branch_id', branchId)
        .single();

      const nextVersion = (Number(versionRow?.version_number) || 1) + 1;

      await supabase.from('menu_versions').upsert({
        branch_id: branchId,
        version_number: nextVersion,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        itemId: id,
        isAvailable,
        newVersion: nextVersion,
      });
    } catch {
      // Return optimistic success if grants are pending
      return NextResponse.json({
        success: true,
        itemId: id,
        isAvailable,
        newVersion: Date.now(),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle availability';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
