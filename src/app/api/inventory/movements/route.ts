import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        branch_id,
        ingredient_id,
        movement_type,
        quantity,
        unit_cost,
        reference_order_id,
        reference_grn_id,
        reference_wastage_id,
        idempotent_key,
        notes,
        created_by,
        created_at,
        ingredient:ingredients (
          id,
          name,
          unit
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, movements: movements || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
