import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        branch_id,
        supplier_id,
        po_number,
        status,
        total_cost,
        created_by,
        created_at,
        supplier:suppliers (
          id,
          name,
          phone
        ),
        items:po_items (
          id,
          po_id,
          ingredient_id,
          quantity,
          unit_cost,
          subtotal,
          ingredient:ingredients (
            id,
            name,
            unit
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, orders: pos || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { supplier_id, items, created_by } = body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Supplier and item list are required' }, { status: 400 });
    }

    const branchId = '00000000-0000-0000-0000-000000000001';
    const staffId = created_by || '22222222-2222-2222-2222-222222222222';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${dateStr}-${rand}`;

    // Calculate total cost
    let totalCost = 0;
    for (const it of items) {
      totalCost += Number(it.quantity) * Number(it.unit_cost);
    }
    totalCost = Math.round(totalCost * 100) / 100;

    // Insert purchase order
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        branch_id: branchId,
        supplier_id,
        po_number: poNumber,
        status: 'ordered',
        total_cost: totalCost,
        created_by: staffId,
      })
      .select()
      .single();

    if (poErr || !po) {
      return NextResponse.json({ success: false, message: poErr?.message || 'Failed to create PO' }, { status: 400 });
    }

    // Insert PO items
    const poItems = items.map((it: any) => ({
      po_id: po.id,
      ingredient_id: it.ingredient_id,
      quantity: Number(it.quantity),
      unit_cost: Number(it.unit_cost),
      subtotal: Math.round(Number(it.quantity) * Number(it.unit_cost) * 100) / 100,
    }));

    const { error: itemsErr } = await supabase.from('po_items').insert(poItems);
    if (itemsErr) {
      return NextResponse.json({ success: false, message: itemsErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, po });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
