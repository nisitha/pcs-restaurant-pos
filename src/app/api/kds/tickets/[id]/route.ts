import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    const body = await request.json();
    const { action, chefId, notes } = body;

    if (!ticketId || !action) {
      return NextResponse.json(
        { success: false, message: 'Ticket ID and action are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch current ticket and order ID
    const { data: ticket, error: ticketError } = await supabase
      .from('station_routing_tickets')
      .select('id, order_id, branch_id, station_id, status, ticket_number')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const orderId = ticket.order_id;
    const branchId = ticket.branch_id;
    const nowUtc = new Date().toISOString();

    if (action === 'start') {
      // 2A. Mark ticket in_preparation
      const updatePayload: any = {
        status: 'in_preparation',
        started_at: nowUtc,
      };
      if (chefId) updatePayload.prepared_by_user_id = chefId;

      await supabase
        .from('station_routing_tickets')
        .update(updatePayload)
        .eq('id', ticketId);

      // Update linked order_items to in_preparation
      const { data: ticketItems } = await supabase
        .from('station_ticket_items')
        .select('order_item_id')
        .eq('ticket_id', ticketId);

      if (ticketItems && ticketItems.length > 0) {
        const itemIds = ticketItems.map((ti: any) => ti.order_item_id);
        await supabase
          .from('order_items')
          .update({ kds_status: 'in_preparation' })
          .in('id', itemIds);
      }

      // If parent order is still submitted, move it to in_preparation
      const { data: order } = await supabase
        .from('orders')
        .select('kds_status')
        .eq('id', orderId)
        .single();

      if (order && order.kds_status === 'submitted') {
        await supabase
          .from('orders')
          .update({ kds_status: 'in_preparation', updated_at: nowUtc })
          .eq('id', orderId);
      }

      // Audit log
      if (chefId) {
        await supabase.from('audit_logs').insert({
          branch_id: branchId,
          user_id: chefId,
          action_type: 'kds_ticket_start',
          entity_name: 'station_routing_tickets',
          entity_id: ticketId,
          new_data: { status: 'in_preparation', started_at: nowUtc },
          reason: `Ticket ${ticket.ticket_number} started preparation`,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'in_preparation',
        ticketId,
        orderId,
      });
    } else if (action === 'ready') {
      // 2B. Mark ticket ready
      await supabase
        .from('station_routing_tickets')
        .update({
          status: 'ready',
          ready_at: nowUtc,
        })
        .eq('id', ticketId);

      // Update linked order_items to ready
      const { data: ticketItems } = await supabase
        .from('station_ticket_items')
        .select('order_item_id')
        .eq('ticket_id', ticketId);

      if (ticketItems && ticketItems.length > 0) {
        const itemIds = ticketItems.map((ti: any) => ti.order_item_id);
        await supabase
          .from('order_items')
          .update({ kds_status: 'ready' })
          .in('id', itemIds);
      }

      // Check all sibling station tickets for this parent order
      const { data: allSiblingTickets } = await supabase
        .from('station_routing_tickets')
        .select('id, status')
        .eq('order_id', orderId);

      const allTickets = allSiblingTickets || [];
      const nonReadyTickets = allTickets.filter(
        (t: any) => t.id !== ticketId && !['ready', 'served', 'completed'].includes(t.status)
      );

      let newOrderKdsStatus: 'ready' | 'partially_ready' = 'partially_ready';
      if (nonReadyTickets.length === 0) {
        // Every single station ticket for this order is now ready!
        newOrderKdsStatus = 'ready';
      }

      await supabase
        .from('orders')
        .update({
          kds_status: newOrderKdsStatus,
          updated_at: nowUtc,
        })
        .eq('id', orderId);

      // Audit log
      if (chefId) {
        await supabase.from('audit_logs').insert({
          branch_id: branchId,
          user_id: chefId,
          action_type: 'kds_ticket_ready',
          entity_name: 'station_routing_tickets',
          entity_id: ticketId,
          new_data: { status: 'ready', order_kds_status: newOrderKdsStatus },
          reason: `Ticket ${ticket.ticket_number} marked ready. Parent order is ${newOrderKdsStatus}.`,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'ready',
        orderKdsStatus: newOrderKdsStatus,
        ticketId,
        orderId,
      });
    } else if (action === 'recall') {
      // 2C. Recall ticket: set back to in_preparation or ready
      await supabase
        .from('station_routing_tickets')
        .update({
          status: 'in_preparation',
          ready_at: null,
          completed_at: null,
        })
        .eq('id', ticketId);

      // Parent order goes back to in_preparation or partially_ready
      await supabase
        .from('orders')
        .update({
          kds_status: 'in_preparation',
          updated_at: nowUtc,
        })
        .eq('id', orderId);

      return NextResponse.json({
        success: true,
        status: 'in_preparation',
        ticketId,
        orderId,
        message: 'Ticket successfully recalled to kitchen prep.',
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update KDS ticket';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
