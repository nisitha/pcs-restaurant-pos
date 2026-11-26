import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: grns, error } = await supabase
      .from('goods_received_notes')
      .select(`
        id,
        po_id,
        branch_id,
        supplier_id,
        grn_number,
        invoice_number,
        total_received_amount,
        received_by,
        received_at,
        supplier:suppliers (
          id,
          name,
          phone
        ),
        items:grn_items (
          id,
          grn_id,
          ingredient_id,
          quantity_received,
          unit_cost,
          subtotal,
          ingredient:ingredients (
            id,
            name,
            unit
          )
        )
      `)
      .order('received_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, grns: grns || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { po_id, supplier_id, invoice_number, items, received_by } = body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Supplier and received items are required' }, { status: 400 });
    }

    const branchId = '00000000-0000-0000-0000-000000000001';
    const staffId = received_by || '22222222-2222-2222-2222-222222222222';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const grnNumber = `GRN-${dateStr}-${rand}`;

    // Calculate total amount
    let totalReceived = 0;
    for (const it of items) {
      totalReceived += Number(it.quantity_received) * Number(it.unit_cost);
    }
    totalReceived = Math.round(totalReceived * 100) / 100;

    // 1. Insert GRN header
    const { data: grn, error: grnErr } = await supabase
      .from('goods_received_notes')
      .insert({
        po_id: po_id || null,
        branch_id: branchId,
        supplier_id,
        grn_number: grnNumber,
        invoice_number: invoice_number || null,
        total_received_amount: totalReceived,
        received_by: staffId,
      })
      .select()
      .single();

    if (grnErr || !grn) {
      return NextResponse.json({ success: false, message: grnErr?.message || 'Failed to create GRN' }, { status: 400 });
    }

    // 2. Insert GRN items, update ingredient stock and unit costs, and write stock movements
    for (const it of items) {
      const qtyReceived = Number(it.quantity_received);
      const unitCost = Number(it.unit_cost);
      const subtotal = Math.round(qtyReceived * unitCost * 100) / 100;

      // Insert GRN Item
      await supabase.from('grn_items').insert({
        grn_id: grn.id,
        ingredient_id: it.ingredient_id,
        quantity_received: qtyReceived,
        unit_cost: unitCost,
        subtotal,
      });

      // Fetch current ingredient stock
      const { data: ing } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', it.ingredient_id)
        .single();

      if (ing) {
        const newStock = Number(ing.current_stock || 0) + qtyReceived;

        // Update ingredient current_stock and replacement unit_cost
        await supabase
          .from('ingredients')
          .update({
            current_stock: newStock,
            unit_cost: unitCost > 0 ? unitCost : ing.unit_cost,
            updated_at: now.toISOString(),
          })
          .eq('id', it.ingredient_id);

        // Record stock movement
        const idempotentKey = `GRN-${grn.id}-${it.ingredient_id}`;
        await supabase.from('stock_movements').insert({
          branch_id: branchId,
          ingredient_id: it.ingredient_id,
          movement_type: 'purchase_grn',
          quantity: qtyReceived,
          unit_cost: unitCost,
          reference_grn_id: grn.id,
          idempotent_key: idempotentKey,
          notes: `GRN Receiving ${grnNumber}: +${qtyReceived} ${ing.unit} @ Rs. ${unitCost}. Invoice: ${invoice_number || 'N/A'}`,
          created_by: staffId,
          created_at: now.toISOString(),
        });
      }
    }

    // 3. If tied to a PO, update PO status to received
    if (po_id) {
      await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', po_id);
    }

    return NextResponse.json({ success: true, grn });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
