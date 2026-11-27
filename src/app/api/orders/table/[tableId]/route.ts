import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const supabase = await createClient();

    // 1. Fetch Table info
    const { data: table, error: tableErr } = await supabase
      .from('dining_tables')
      .select('id, branch_id, table_number, capacity, section, status')
      .eq('id', tableId)
      .single();

    if (tableErr || !table) {
      return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
    }

    // 2. Fetch Active Unpaid Order on this table (if any)
    const { data: activeOrder } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        order_source,
        kds_status,
        payment_status,
        total_amount,
        created_at,
        requires_staff_approval,
        order_items(
          id,
          item_name,
          quantity,
          unit_price,
          subtotal,
          kds_status
        )
      `)
      .eq('table_id', tableId)
      .eq('payment_status', 'unpaid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      table,
      activeOrder: activeOrder || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
