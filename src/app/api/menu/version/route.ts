import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('menu_versions')
      .select('version_number, updated_at')
      .eq('branch_id', branchId)
      .single();

    if (error || !data) {
      return NextResponse.json({ version: 1, updatedAt: new Date().toISOString() });
    }

    return NextResponse.json({
      version: Number(data.version_number) || 1,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ version: 1, updatedAt: new Date().toISOString() });
  }
}
