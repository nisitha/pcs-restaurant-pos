import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const supabase = await createClient();

    let query = supabase
      .from('inter_branch_stock_transfers')
      .select(`
        id,
        transfer_number,
        from_branch_id,
        to_branch_id,
        status,
        created_by,
        received_by,
        notes,
        created_at,
        updated_at,
        from_branch:branches!inter_branch_stock_transfers_from_branch_id_fkey(id, name, code),
        to_branch:branches!inter_branch_stock_transfers_to_branch_id_fkey(id, name, code),
        creator:user_profiles!inter_branch_stock_transfers_created_by_fkey(display_name),
        items:inter_branch_transfer_items(
          id,
          ingredient_id,
          quantity,
          unit_cost,
          ingredient:ingredients(id, name, unit, current_stock)
        )
      `)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, transfers: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, transfers: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from_branch_id, to_branch_id, staff_id, notes, items = [] } = body;

    if (!from_branch_id || !to_branch_id || from_branch_id === to_branch_id) {
      return NextResponse.json(
        { success: false, message: 'Source and distinct Destination branches are required.' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one ingredient item is required for transfer.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fallback creator staff ID if not provided
    let creatorId = staff_id;
    if (!creatorId) {
      const { data: staff } = await supabase.from('user_profiles').select('id').limit(1).single();
      creatorId = staff?.id || '11111111-1111-1111-1111-111111111111';
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transferNumber = `TRF-${dateStr}-${randomSuffix}`;

    // 1. Insert Transfer Header
    const { data: transfer, error: tErr } = await supabase
      .from('inter_branch_stock_transfers')
      .insert({
        transfer_number: transferNumber,
        from_branch_id,
        to_branch_id,
        status: 'pending',
        created_by: creatorId,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (tErr) throw tErr;

    // 2. Insert Transfer Items
    const itemsToInsert = items.map((item: any) => ({
      transfer_id: transfer.id,
      ingredient_id: item.ingredient_id,
      quantity: Number(item.quantity),
      unit_cost: Number(item.unit_cost || 0),
    }));

    const { error: itemsErr } = await supabase
      .from('inter_branch_transfer_items')
      .insert(itemsToInsert);

    if (itemsErr) throw itemsErr;

    return NextResponse.json({
      success: true,
      message: 'Transfer request created successfully',
      transfer,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
