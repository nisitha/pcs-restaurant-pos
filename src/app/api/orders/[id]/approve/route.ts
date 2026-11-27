import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { staffId } = body;

    const supabase = await createClient();

    let staff = staffId;
    if (!staff) {
      const { data: user } = await supabase.from('user_profiles').select('id').limit(1).single();
      staff = user?.id || '11111111-1111-1111-1111-111111111111';
    }

    // Try RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_self_order', {
      p_order_id: id,
      p_staff_id: staff,
    });

    if (!rpcError && rpcData && rpcData.success) {
      return NextResponse.json({ success: true, message: rpcData.message });
    }

    // Direct fallback
    await supabase
      .from('orders')
      .update({
        requires_staff_approval: false,
        approved_by: staff,
        approved_at: new Date().toISOString(),
        kds_status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await supabase
      .from('order_items')
      .update({ kds_status: 'submitted' })
      .eq('order_id', id);

    await supabase
      .from('station_routing_tickets')
      .update({ kds_status: 'submitted' })
      .eq('order_id', id);

    return NextResponse.json({ success: true, message: 'Order approved and sent to KDS' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
