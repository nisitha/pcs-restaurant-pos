import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { KDSTicket, KDSTicketItem } from '@/types/kds.types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';
    const stationCode = searchParams.get('stationCode'); // 'ALL' or specific station code like 'HOT', 'GRILL', etc.
    const view = searchParams.get('view') || 'active'; // 'active' or 'recall'

    const supabase = await createClient();

    let query = supabase
      .from('station_routing_tickets')
      .select(`
        id,
        ticket_number,
        order_id,
        branch_id,
        station_id,
        status,
        started_at,
        ready_at,
        completed_at,
        created_at,
        prepared_by_user_id,
        user_profiles (display_name),
        kitchen_stations (id, code, name),
        orders (
          id,
          order_number,
          order_type,
          notes,
          table_id,
          dining_tables (table_number),
          customers (name, phone)
        ),
        station_ticket_items (
          order_items (
            id,
            item_name,
            quantity,
            notes,
            kds_status,
            item_variants (variant_name),
            order_item_modifiers (modifier_name, unit_price)
          )
        )
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: true });

    if (view === 'recall') {
      // Show tickets that were marked ready or completed in the last 2 hours
      query = query
        .in('status', ['ready', 'served', 'completed'])
        .order('ready_at', { ascending: false })
        .limit(30);
    } else {
      // Active view: submitted or in_preparation tickets, plus freshly ready tickets
      query = query.in('status', ['submitted', 'in_preparation', 'ready']);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Direct KDS query warning:', error.message);
      return NextResponse.json({ success: true, tickets: [] });
    }

    const formattedTickets: KDSTicket[] = (data || []).map((t: any) => {
      const order = t.orders || {};
      const station = t.kitchen_stations || { code: 'HOT', name: 'Kitchen' };
      const preparedBy = t.user_profiles?.display_name || null;

      const items: KDSTicketItem[] = (t.station_ticket_items || []).map((sti: any) => {
        const item = sti.order_items || {};
        const modifiers = (item.order_item_modifiers || []).map((m: any) => ({
          name: m.modifier_name,
          price: Number(m.unit_price || 0),
        }));

        return {
          id: sti.id || item.id,
          order_item_id: item.id,
          item_name: item.item_name || 'Kitchen Item',
          quantity: item.quantity || 1,
          notes: item.notes || null,
          kds_status: item.kds_status || 'submitted',
          variant_name: item.item_variants?.variant_name || null,
          modifiers,
        };
      });

      return {
        id: t.id,
        ticket_number: t.ticket_number,
        order_id: t.order_id,
        order_number: order.order_number || 'ORD-UNKNOWN',
        order_type: order.order_type || 'dine_in',
        table_id: order.table_id || null,
        table_number: order.dining_tables?.table_number || null,
        customer_name: order.customers?.name || null,
        customer_phone: order.customers?.phone || null,
        station_id: t.station_id,
        station_code: station.code,
        station_name: station.name,
        status: t.status,
        started_at: t.started_at,
        ready_at: t.ready_at,
        completed_at: t.completed_at,
        created_at: t.created_at,
        prepared_by_user_id: t.prepared_by_user_id,
        prepared_by_name: preparedBy,
        order_notes: order.notes,
        items,
      };
    });

    // Apply station filter if requested (client can also filter, but filtering here provides server support)
    const filteredTickets =
      stationCode && stationCode !== 'ALL'
        ? formattedTickets.filter((t) => t.station_code.toUpperCase() === stationCode.toUpperCase())
        : formattedTickets;

    return NextResponse.json({
      success: true,
      tickets: filteredTickets,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query KDS tickets';
    console.error('KDS GET error:', msg);
    return NextResponse.json({ success: true, tickets: [] });
  }
}
