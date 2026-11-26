import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, waiterId, items = [], notes } = body;

    if (!orderId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Order ID and amendment items are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch parent order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, branch_id, order_number, order_type, subtotal, service_charge_amount, total_amount, discount_amount, delivery_fee')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: 'Parent order not found.' },
        { status: 404 }
      );
    }

    const branchId = order.branch_id;
    const nowUtc = new Date().toISOString();

    // 2. Fetch branch rates
    const { data: branch } = await supabase
      .from('branches')
      .select('service_charge_rate')
      .eq('id', branchId)
      .single();
    const serviceRate = Number(branch?.service_charge_rate || 10.0);

    // 3. Insert new order items
    let amendmentSubtotal = 0;
    const insertedItemRecords: any[] = [];

    for (const item of items) {
      const unitPrice = Number(item.unit_price || 0);
      const qty = Number(item.quantity || 1);
      const itemSubtotal = unitPrice * qty;
      amendmentSubtotal += itemSubtotal;

      // Find default station if missing
      let stationId = item.station_id;
      if (!stationId && item.menu_item_id) {
        const { data: mi } = await supabase
          .from('menu_items')
          .select('default_station_id')
          .eq('id', item.menu_item_id)
          .single();
        stationId = mi?.default_station_id;
      }
      if (!stationId) {
        const { data: ks } = await supabase
          .from('kitchen_stations')
          .select('id')
          .eq('branch_id', branchId)
          .limit(1)
          .single();
        stationId = ks?.id;
      }

      const { data: insertedItem, error: itemErr } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          branch_id: branchId,
          menu_item_id: item.menu_item_id || null,
          variant_id: item.variant_id || null,
          item_name: item.item_name,
          unit_price: unitPrice,
          quantity: qty,
          subtotal: itemSubtotal,
          station_id: stationId,
          kds_status: 'submitted',
          notes: item.notes ? `[AMENDMENT] ${item.notes}` : '[AMENDMENT]',
          created_at: nowUtc,
        })
        .select()
        .single();

      if (insertedItem) {
        insertedItemRecords.push({ ...insertedItem, station_id: stationId });

        // Insert modifiers if any
        if (item.modifiers && item.modifiers.length > 0) {
          const modInserts = item.modifiers.map((m: any) => ({
            order_item_id: insertedItem.id,
            modifier_id: m.modifier_id || null,
            modifier_name: m.modifier_name,
            unit_price: Number(m.unit_price || 0),
          }));
          await supabase.from('order_item_modifiers').insert(modInserts);
        }
      }
    }

    // 4. Update parent order financial totals
    const newSubtotal = Number(order.subtotal) + amendmentSubtotal;
    let newServiceCharge = Number(order.service_charge_amount);
    if (order.order_type === 'dine_in' && serviceRate > 0) {
      newServiceCharge = Math.round((newSubtotal * serviceRate) / 100 * 100) / 100;
    }
    const newTotal = newSubtotal - Number(order.discount_amount) + newServiceCharge + Number(order.delivery_fee);

    await supabase
      .from('orders')
      .update({
        subtotal: newSubtotal,
        service_charge_amount: newServiceCharge,
        total_amount: newTotal,
        kds_status: 'in_preparation',
        updated_at: nowUtc,
      })
      .eq('id', orderId);

    // 5. Create amendment station tickets
    // Group inserted items by station
    const itemsByStation = new Map<string, any[]>();
    for (const itm of insertedItemRecords) {
      const arr = itemsByStation.get(itm.station_id) || [];
      arr.push(itm);
      itemsByStation.set(itm.station_id, arr);
    }

    // Count existing tickets for this order to increment amendment index
    const { count: ticketCount } = await supabase
      .from('station_routing_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);

    const amdIndex = (ticketCount || 1) + 1;
    const orderSeq = order.order_number.slice(-4);

    for (const [stnId, stnItems] of itemsByStation.entries()) {
      const { data: stn } = await supabase
        .from('kitchen_stations')
        .select('code, name')
        .eq('id', stnId)
        .single();
      const stnCode = stn?.code || 'KT';

      const ticketNumber = `TKT-${stnCode}-${orderSeq}-A${amdIndex}`;

      const { data: newTicket } = await supabase
        .from('station_routing_tickets')
        .insert({
          ticket_number: ticketNumber,
          order_id: orderId,
          branch_id: branchId,
          station_id: stnId,
          status: 'submitted',
          created_at: nowUtc,
        })
        .select()
        .single();

      if (newTicket) {
        const ticketItemLinks = stnItems.map((si) => ({
          ticket_id: newTicket.id,
          order_item_id: si.id,
        }));
        await supabase.from('station_ticket_items').insert(ticketItemLinks);
      }
    }

    // 6. Write to audit_logs
    if (waiterId) {
      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: waiterId,
        action_type: 'order_amendment',
        entity_name: 'orders',
        entity_id: orderId,
        new_data: {
          added_items_count: items.length,
          amendment_subtotal: amendmentSubtotal,
          new_total: newTotal,
        },
        reason: notes || 'Waiter added extra items to open order',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Items added and amendment ticket routed to kitchen.',
      newTotal,
      addedCount: items.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to amend order';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
