import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { waiterId, notes } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const nowUtc = new Date().toISOString();

    // 1. Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, branch_id, order_number, table_id, kds_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: 'Order not found.' },
        { status: 404 }
      );
    }

    // 2. Update order kds_status to 'served'
    await supabase
      .from('orders')
      .update({
        kds_status: 'served',
        updated_at: nowUtc,
      })
      .eq('id', orderId);

    // 3. Mark all station tickets for this order as completed
    await supabase
      .from('station_routing_tickets')
      .update({
        status: 'completed',
        completed_at: nowUtc,
      })
      .eq('order_id', orderId);

    // 4. Mark all order items as served
    await supabase
      .from('order_items')
      .update({
        kds_status: 'served',
      })
      .eq('order_id', orderId);

    // 5. Write audit log
    if (waiterId) {
      await supabase.from('audit_logs').insert({
        branch_id: order.branch_id,
        user_id: waiterId,
        action_type: 'order_served',
        entity_name: 'orders',
        entity_id: orderId,
        new_data: { kds_status: 'served', order_number: order.order_number },
        reason: notes || 'Waiter marked order as served to guests',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_number} marked as served.`,
      status: 'served',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark order as served';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
