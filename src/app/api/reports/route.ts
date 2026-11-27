import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today'; // 'today', 'week', 'month', 'all'

    // Compute start timestamp
    const now = new Date();
    let startDate: Date;

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(0); // all time
    }

    const startISO = startDate.toISOString();

    // 1. Fetch Orders within range
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        payment_status,
        kds_status,
        subtotal,
        discount_amount,
        service_charge_amount,
        total_amount,
        paid_amount,
        cashier_id,
        waiter_id,
        created_at,
        cashier:user_profiles!orders_cashier_id_fkey(id, display_name),
        waiter:user_profiles!orders_waiter_id_fkey(id, display_name),
        order_items (
          id,
          menu_item_id,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .gte('created_at', startISO)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return NextResponse.json({ success: false, message: ordersErr.message }, { status: 400 });
    }

    // 2. Fetch Payments within range
    const { data: payments } = await supabase
      .from('payments')
      .select('id, method, amount, currency, created_at')
      .gte('created_at', startISO);

    // 3. Fetch Stock Movements (COGS & Usage) within range
    const { data: movements } = await supabase
      .from('stock_movements')
      .select(`
        id,
        ingredient_id,
        movement_type,
        quantity,
        unit_cost,
        created_at,
        ingredient:ingredients(name, unit)
      `)
      .gte('created_at', startISO);

    // 4. Fetch Station Tickets (Kitchen Speed) within range
    const { data: tickets } = await supabase
      .from('station_routing_tickets')
      .select(`
        id,
        ticket_number,
        status,
        started_at,
        completed_at,
        station:kitchen_stations(name, code),
        created_at
      `)
      .gte('created_at', startISO);

    // 5. Fetch Wastage Logs
    const { data: wastage } = await supabase
      .from('wastage_logs')
      .select('id, quantity, unit_cost, total_cost, reason, created_at')
      .gte('created_at', startISO);

    // Compute Financial Metrics
    const allOrders = orders || [];
    const paidOrders = allOrders.filter((o) => o.payment_status === 'paid');
    const voidedOrders = allOrders.filter((o) => o.payment_status === 'voided' || o.payment_status === 'refunded');

    const grossRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalDiscounts = paidOrders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);
    const totalRefunds = voidedOrders.reduce((sum, o) => sum + Number(o.paid_amount || o.total_amount), 0);
    const netSales = grossRevenue - totalDiscounts;

    // Payment Reconciliation
    const tenderBreakdown = {
      cash: 0,
      credit_card: 0,
      qr_payment: 0,
    };
    (payments || []).forEach((p) => {
      const amt = Number(p.amount);
      if (p.method === 'cash') tenderBreakdown.cash += amt;
      else if (p.method === 'credit_card') tenderBreakdown.credit_card += amt;
      else if (p.method === 'qr_payment') tenderBreakdown.qr_payment += amt;
    });

    // COGS & Recipe Food Cost from Sale Deductions
    const saleDeductions = (movements || []).filter((m) => m.movement_type === 'sale_deduction');
    const totalCogs = saleDeductions.reduce(
      (sum, m) => sum + Math.abs(Number(m.quantity)) * Number(m.unit_cost),
      0
    );
    const totalWastage = (wastage || []).reduce((sum, w) => sum + Number(w.total_cost), 0);

    const estimatedGrossProfit = netSales - totalCogs;
    const grossProfitMargin = netSales > 0 ? Math.round((estimatedGrossProfit / netSales) * 1000) / 10 : 0;

    // Staff Performance
    const cashierStats: Record<string, { name: string; count: number; total: number }> = {};
    const waiterStats: Record<string, { name: string; count: number; total: number }> = {};

    paidOrders.forEach((o: any) => {
      const cashierObj = Array.isArray(o.cashier) ? o.cashier[0] : o.cashier;
      const waiterObj = Array.isArray(o.waiter) ? o.waiter[0] : o.waiter;
      const cName = cashierObj?.display_name || 'Cashier';
      const wName = waiterObj?.display_name || 'Waiter / Counter';
      const amt = Number(o.total_amount);

      if (!cashierStats[cName]) cashierStats[cName] = { name: cName, count: 0, total: 0 };
      cashierStats[cName].count += 1;
      cashierStats[cName].total += amt;

      if (!waiterStats[wName]) waiterStats[wName] = { name: wName, count: 0, total: 0 };
      waiterStats[wName].count += 1;
      waiterStats[wName].total += amt;
    });

    // Kitchen Station Speed
    const stationSpeed: Record<string, { name: string; completedCount: number; totalMinutes: number }> = {};
    let delayedCount = 0;

    (tickets || []).forEach((t: any) => {
      const sName = t.station?.name || 'Hot Kitchen';
      if (!stationSpeed[sName]) stationSpeed[sName] = { name: sName, completedCount: 0, totalMinutes: 0 };

      if (t.started_at && t.completed_at) {
        const diffMs = new Date(t.completed_at).getTime() - new Date(t.started_at).getTime();
        const diffMins = Math.max(1, Math.round(diffMs / 60000));
        stationSpeed[sName].completedCount += 1;
        stationSpeed[sName].totalMinutes += diffMins;

        if (diffMins > 20) {
          delayedCount += 1;
        }
      }
    });

    const stationAverages = Object.values(stationSpeed).map((st) => ({
      name: st.name,
      completed_tickets: st.completedCount,
      avg_prep_time_minutes:
        st.completedCount > 0 ? Math.round((st.totalMinutes / st.completedCount) * 10) / 10 : 0,
    }));

    return NextResponse.json({
      success: true,
      range,
      financials: {
        gross_revenue: Math.round(grossRevenue * 100) / 100,
        discounts: Math.round(totalDiscounts * 100) / 100,
        refunds: Math.round(totalRefunds * 100) / 100,
        net_sales: Math.round(netSales * 100) / 100,
        cogs: Math.round(totalCogs * 100) / 100,
        wastage: Math.round(totalWastage * 100) / 100,
        gross_profit: Math.round(estimatedGrossProfit * 100) / 100,
        gross_profit_margin: grossProfitMargin,
        tender_breakdown: tenderBreakdown,
        paid_orders_count: paidOrders.length,
        voided_orders_count: voidedOrders.length,
      },
      staff: {
        cashiers: Object.values(cashierStats),
        waiters: Object.values(waiterStats),
      },
      kitchen: {
        station_averages: stationAverages,
        total_tickets: (tickets || []).length,
        delayed_tickets_count: delayedCount,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
