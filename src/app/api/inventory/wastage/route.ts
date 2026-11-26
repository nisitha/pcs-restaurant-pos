import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: logs, error } = await supabase
      .from('wastage_logs')
      .select(`
        id,
        branch_id,
        ingredient_id,
        quantity,
        unit_cost,
        total_cost,
        reason,
        logged_by,
        created_at,
        ingredient:ingredients (
          id,
          name,
          unit
        ),
        user:user_profiles (
          id,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, logs: logs || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { ingredient_id, quantity, reason, logged_by } = body;

    if (!ingredient_id || !quantity || !reason) {
      return NextResponse.json({ success: false, message: 'Ingredient, quantity, and reason are mandatory' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      return NextResponse.json({ success: false, message: 'Quantity must be greater than 0' }, { status: 400 });
    }

    // 1. Fetch ingredient
    const { data: ingredient, error: ingErr } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', ingredient_id)
      .single();

    if (ingErr || !ingredient) {
      return NextResponse.json({ success: false, message: 'Ingredient not found' }, { status: 404 });
    }

    const unitCost = Number(ingredient.unit_cost || 0);
    const totalCost = Math.round(qty * unitCost * 100) / 100;
    const now = new Date().toISOString();
    const staffId = logged_by || '22222222-2222-2222-2222-222222222222'; // Default Manager

    // 2. Insert into wastage_logs
    const { data: wastage, error: wasteErr } = await supabase
      .from('wastage_logs')
      .insert({
        branch_id: ingredient.branch_id,
        ingredient_id,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        reason,
        logged_by: staffId,
        created_at: now,
      })
      .select()
      .single();

    if (wasteErr || !wastage) {
      return NextResponse.json({ success: false, message: wasteErr?.message || 'Failed to log wastage' }, { status: 400 });
    }

    // 3. Deduct stock from ingredients
    await supabase
      .from('ingredients')
      .update({
        current_stock: Math.max(0, Number(ingredient.current_stock || 0) - qty),
        updated_at: now,
      })
      .eq('id', ingredient_id);

    // 4. Log in immutable stock movements
    const idempotentKey = `WASTE-${wastage.id}`;
    await supabase.from('stock_movements').insert({
      branch_id: ingredient.branch_id,
      ingredient_id,
      movement_type: 'wastage_spoilage',
      quantity: -qty,
      unit_cost: unitCost,
      reference_wastage_id: wastage.id,
      idempotent_key: idempotentKey,
      notes: `Wastage logged: ${qty} ${ingredient.unit} ${ingredient.name}. Reason: ${reason}`,
      created_by: staffId,
      created_at: now,
    });

    return NextResponse.json({ success: true, wastage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
