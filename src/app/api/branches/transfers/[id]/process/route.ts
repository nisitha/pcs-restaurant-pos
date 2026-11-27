import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { staff_id } = body;

    const supabase = await createClient();

    let staffId = staff_id;
    if (!staffId) {
      const { data: staff } = await supabase.from('user_profiles').select('id').limit(1).single();
      staffId = staff?.id || '11111111-1111-1111-1111-111111111111';
    }

    // Call atomic RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('process_inter_branch_transfer', {
      p_transfer_id: id,
      p_staff_id: staffId,
    });

    if (!rpcError && rpcData && rpcData.success) {
      return NextResponse.json({ success: true, message: rpcData.message });
    }

    if (rpcError) {
      // Fallback direct execution if migration hasn't been executed
      const { data: transfer, error: tErr } = await supabase
        .from('inter_branch_stock_transfers')
        .select(`
          *,
          items:inter_branch_transfer_items(
            *,
            ingredient:ingredients(*)
          )
        `)
        .eq('id', id)
        .single();

      if (tErr || !transfer) {
        return NextResponse.json({ success: false, message: 'Transfer not found' }, { status: 404 });
      }

      if (transfer.status !== 'pending') {
        return NextResponse.json({ success: false, message: `Transfer is already ${transfer.status}` }, { status: 400 });
      }

      // Process items manually
      for (const item of transfer.items || []) {
        // Deduct from source
        await supabase
          .from('ingredients')
          .update({ current_stock: Math.max(0, Number(item.ingredient.current_stock) - Number(item.quantity)) })
          .eq('id', item.ingredient_id);

        // Find or create in dest
        const { data: destIng } = await supabase
          .from('ingredients')
          .select('id, current_stock')
          .eq('branch_id', transfer.to_branch_id)
          .ilike('name', item.ingredient.name.trim())
          .limit(1)
          .single();

        if (destIng) {
          await supabase
            .from('ingredients')
            .update({ current_stock: Number(destIng.current_stock) + Number(item.quantity) })
            .eq('id', destIng.id);
        } else {
          await supabase.from('ingredients').insert({
            branch_id: transfer.to_branch_id,
            name: item.ingredient.name,
            unit: item.ingredient.unit,
            current_stock: Number(item.quantity),
            min_stock_level: 5,
            unit_cost: item.unit_cost,
            category: 'transferred',
          });
        }
      }

      await supabase
        .from('inter_branch_stock_transfers')
        .update({
          status: 'completed',
          received_by: staffId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ success: true, message: 'Transfer completed successfully' });
    }

    return NextResponse.json({ success: false, message: rpcData?.message || 'Failed to process transfer' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
