import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';

    const supabase = await createClient();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        order_source,
        customer_name,
        customer_phone,
        delivery_address,
        delivery_fee,
        total_amount,
        payment_status,
        kds_status,
        delivery_status,
        delivery_rider_id,
        dispatch_time,
        delivered_time,
        created_at,
        customer:customers(name, phone, delivery_address),
        rider:delivery_riders(id, name, phone, vehicle_plate, vehicle_type),
        items:order_items(id, item_name, quantity, subtotal)
      `)
      .eq('branch_id', branchId)
      .eq('order_type', 'delivery')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ success: true, orders: [] });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, riderId, deliveryStatus } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (riderId !== undefined) {
      updatePayload.delivery_rider_id = riderId;
    }

    if (deliveryStatus) {
      updatePayload.delivery_status = deliveryStatus;

      if (deliveryStatus === 'dispatched') {
        updatePayload.dispatch_time = new Date().toISOString();
        // If rider assigned, set rider status to on_delivery
        if (riderId) {
          await supabase
            .from('delivery_riders')
            .update({ status: 'on_delivery' })
            .eq('id', riderId);
        }
      } else if (deliveryStatus === 'delivered') {
        updatePayload.delivered_time = new Date().toISOString();
        updatePayload.payment_status = 'paid'; // delivery completed
        // Release rider to available
        if (riderId) {
          await supabase
            .from('delivery_riders')
            .update({ status: 'available' })
            .eq('id', riderId);
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
