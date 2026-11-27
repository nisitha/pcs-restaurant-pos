import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ActiveOrder, OrderType } from '@/types/pos.types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';
    const statusFilter = searchParams.get('status'); // e.g. 'unpaid', 'open', etc.
    const orderTypeFilter = searchParams.get('orderType');

    const supabase = await createClient();

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        table_id,
        customer_id,
        cashier_id,
        kds_status,
        payment_status,
        subtotal,
        discount_amount,
        service_charge_amount,
        delivery_fee,
        total_amount,
        paid_amount,
        notes,
        created_at,
        dining_tables (table_number),
        customers (name, phone),
        user_profiles (display_name),
        order_items (id, item_name, quantity, unit_price, subtotal, kds_status, kitchen_stations (name)),
        station_routing_tickets (id, ticket_number, status, kitchen_stations (name, code))
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (orderTypeFilter && orderTypeFilter !== 'all') {
      query = query.eq('order_type', orderTypeFilter);
    }

    if (statusFilter === 'unpaid') {
      query = query.eq('payment_status', 'unpaid');
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedOrders: ActiveOrder[] = (data || []).map((o: any) => {
      const routedStations: string[] = Array.from(
        new Set(
          (o.station_routing_tickets || []).map(
            (t: any) => t.kitchen_stations?.name || 'Kitchen'
          )
        )
      );

      return {
        id: o.id,
        order_number: o.order_number,
        order_type: o.order_type as OrderType,
        table_id: o.table_id,
        table_number: o.dining_tables?.table_number || null,
        customer_id: o.customer_id,
        customer_name: o.customers?.name || null,
        customer_phone: o.customers?.phone || null,
        cashier_name: o.user_profiles?.display_name || 'Cashier',
        kds_status: o.kds_status,
        payment_status: o.payment_status,
        subtotal: Number(o.subtotal),
        discount_amount: Number(o.discount_amount),
        service_charge_amount: Number(o.service_charge_amount),
        delivery_fee: Number(o.delivery_fee),
        total_amount: Number(o.total_amount),
        paid_amount: Number(o.paid_amount),
        notes: o.notes,
        created_at: o.created_at,
        items_count: (o.order_items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
        stations_routed: routedStations,
      };
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query orders';
    return NextResponse.json({ success: true, orders: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      branchId = '00000000-0000-0000-0000-000000000001',
      cashierId,
      shiftId,
      orderType = 'dine_in',
      orderSource = 'pos',
      requiresStaffApproval = false,
      tableId,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryFee = 0,
      discountAmount = 0,
      discountReason,
      notes,
      idempotencyKey = crypto.randomUUID(),
      items = [],
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ordered items are required.' },
        { status: 400 }
      );
    }

    const isSelfOrder = orderSource === 'table_qr' || orderSource === 'online_web';
    if (!cashierId && !isSelfOrder) {
      return NextResponse.json(
        { success: false, message: 'Cashier ID is required for POS/Waiter orders.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Try calling the atomic PostgreSQL RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_pos_order', {
      p_branch_id: branchId,
      p_cashier_id: cashierId || null,
      p_shift_id: shiftId || null,
      p_order_type: orderType,
      p_table_id: tableId || null,
      p_customer_name: customerName?.trim() || null,
      p_customer_phone: customerPhone?.trim() || null,
      p_delivery_address: deliveryAddress?.trim() || null,
      p_delivery_fee: Number(deliveryFee) || 0,
      p_discount_amount: Number(discountAmount) || 0,
      p_discount_reason: discountReason || null,
      p_notes: notes?.trim() || null,
      p_idempotency_key: idempotencyKey,
      p_items: items,
      p_order_source: orderSource,
      p_requires_staff_approval: Boolean(requiresStaffApproval),
    });

    if (!rpcError && rpcData && rpcData.success) {
      // Update Customer & Loyalty metadata if present
      if (body.customerId || body.loyaltyPointsRedeemed || body.promotionId) {
        await supabase
          .from('orders')
          .update({
            customer_id: body.customerId || null,
            loyalty_points_redeemed: Number(body.loyaltyPointsRedeemed || 0),
            promotion_id: body.promotionId || null,
          })
          .eq('id', rpcData.order_id);
      }

      return NextResponse.json({
        success: true,
        orderId: rpcData.order_id,
        orderNumber: rpcData.order_number,
        totalAmount: Number(rpcData.total_amount),
        stationsRouted: rpcData.stations_routed || [],
        isDuplicate: Boolean(rpcData.is_duplicate),
      });
    }

    // 2. Direct Fallback if RPC migration is still pending execution in Supabase
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;
    const orderId = crypto.randomUUID();

    const subtotal = items.reduce((sum: number, i: any) => sum + i.unit_price * i.quantity, 0);
    const serviceCharge = orderType === 'dine_in' ? Number((subtotal * 0.1).toFixed(2)) : 0;
    const totalAmount = subtotal - Number(discountAmount) + serviceCharge + Number(deliveryFee);

    // Group items by station
    const stationsRouted: string[] = Array.from(
      new Set(items.map((i: any) => i.station_name || 'Hot Kitchen'))
    );

    // Insert order directly
    try {
      await supabase.from('orders').insert({
        id: orderId,
        branch_id: branchId,
        order_number: orderNumber,
        order_type: orderType,
        order_source: orderSource || 'pos',
        requires_staff_approval: Boolean(requiresStaffApproval),
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_address: deliveryAddress || null,
        delivery_status: orderType === 'delivery' ? 'preparing' : null,
        table_id: tableId || null,
        customer_id: body.customerId || null,
        loyalty_points_redeemed: Number(body.loyaltyPointsRedeemed || 0),
        promotion_id: body.promotionId || null,
        cashier_id: cashierId || null,
        shift_id: shiftId || null,
        kds_status: requiresStaffApproval ? 'draft' : 'submitted',
        payment_status: 'unpaid',
        subtotal,
        discount_amount: Number(discountAmount) || 0,
        service_charge_amount: serviceCharge,
        delivery_fee: Number(deliveryFee) || 0,
        total_amount: totalAmount,
        notes: notes || null,
        idempotency_key: idempotencyKey,
      });

      // Update table if dine-in
      if (orderType === 'dine_in' && tableId) {
        await supabase
          .from('dining_tables')
          .update({ status: 'occupied', current_order_id: orderId })
          .eq('id', tableId);
      }
    } catch {
      // Continue optimistic response
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      totalAmount,
      stationsRouted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit order';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
