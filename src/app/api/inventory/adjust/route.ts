import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { ingredient_id, actual_stock, reason, user_id } = body;

    if (!ingredient_id || actual_stock === undefined) {
      return NextResponse.json({ success: false, message: 'Ingredient ID and actual stock are required' }, { status: 400 });
    }

    // 1. Fetch current ingredient stock
    const { data: ingredient, error: ingErr } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', ingredient_id)
      .single();

    if (ingErr || !ingredient) {
      return NextResponse.json({ success: false, message: 'Ingredient not found' }, { status: 404 });
    }

    const currentStock = Number(ingredient.current_stock || 0);
    const newStock = Number(actual_stock);
    const variance = Math.round((newStock - currentStock) * 1000) / 1000;

    if (variance === 0) {
      return NextResponse.json({ success: true, message: 'Stock already matches actual count (variance 0)' });
    }

    const now = new Date().toISOString();
    const defaultStaff = user_id || '22222222-2222-2222-2222-222222222222'; // Default Manager

    // 2. Update ingredient stock
    const { error: updateErr } = await supabase
      .from('ingredients')
      .update({
        current_stock: newStock,
        updated_at: now,
      })
      .eq('id', ingredient_id);

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 400 });
    }

    // 3. Log stock movement
    const idempotentKey = `ADJ-${ingredient_id}-${Date.now()}`;
    await supabase.from('stock_movements').insert({
      branch_id: ingredient.branch_id,
      ingredient_id,
      movement_type: 'manual_adjustment',
      quantity: variance,
      unit_cost: ingredient.unit_cost,
      idempotent_key: idempotentKey,
      notes: `Stock count adjustment: variance ${variance > 0 ? '+' : ''}${variance} ${ingredient.unit}. Reason: ${reason || 'Physical count variance'}`,
      created_by: defaultStaff,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      previous_stock: currentStock,
      actual_stock: newStock,
      variance,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
