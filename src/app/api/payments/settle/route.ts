import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, cashierId, shiftId, payments = [] } = body;

    if (!orderId || !payments || payments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Order ID and payment tender details are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Try calling the PostgreSQL RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('settle_order_payment', {
      p_order_id: orderId,
      p_cashier_id: cashierId,
      p_shift_id: shiftId || null,
      p_payments: payments,
    });

    if (!rpcError && rpcData && rpcData.success) {
      return NextResponse.json({
        success: true,
        orderId: rpcData.order_id,
        orderNumber: rpcData.order_number,
        totalAmount: Number(rpcData.total_amount),
        paidAmount: Number(rpcData.paid_amount),
        paymentStatus: rpcData.payment_status,
        settledAt: rpcData.settled_at,
      });
    }

    // 2. Direct Fallback if RPC migration is pending in Supabase SQL editor
    const { data: order } = await supabase
      .from('orders')
      .select('id, branch_id, order_number, total_amount, paid_amount')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const nowUtc = new Date().toISOString();
    let totalTendered = 0;
    let totalCash = 0;

    for (const p of payments) {
      const amt = Number(p.amount || 0);
      totalTendered += amt;
      if (p.method === 'cash') totalCash += amt;

      await supabase.from('payments').insert({
        order_id: orderId,
        branch_id: order.branch_id,
        shift_id: shiftId || null,
        method: p.method,
        amount: amt,
        currency: 'LKR',
        transaction_ref: p.transactionRef || null,
        created_by: cashierId,
        created_at: nowUtc,
      });
    }

    const newPaidAmount = Number(order.paid_amount || 0) + totalTendered;
    const newStatus = newPaidAmount >= Number(order.total_amount) ? 'paid' : 'partially_paid';

    await supabase
      .from('orders')
      .update({
        paid_amount: newPaidAmount,
        payment_status: newStatus,
        updated_at: nowUtc,
      })
      .eq('id', orderId);

    // Update shift expected cash if cash tender
    if (shiftId && totalCash > 0) {
      const { data: shift } = await supabase
        .from('cash_shifts')
        .select('total_sales, expected_cash, opening_float')
        .eq('id', shiftId)
        .single();
      if (shift) {
        await supabase
          .from('cash_shifts')
          .update({
            total_sales: Number(shift.total_sales || 0) + totalCash,
            expected_cash: Number(shift.expected_cash || shift.opening_float) + totalCash,
          })
          .eq('id', shiftId);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber: order.order_number,
      totalAmount: Number(order.total_amount),
      paidAmount: newPaidAmount,
      paymentStatus: newStatus,
      settledAt: nowUtc,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Payment settlement failed';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
