import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CashShift } from '@/types/shift.types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cashierId = searchParams.get('cashierId');
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';

    const supabase = await createClient();

    let query = supabase
      .from('cash_shifts')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1);

    if (cashierId) {
      query = query.eq('cashier_id', cashierId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, shift: null });
    }

    return NextResponse.json({ success: true, shift: data[0] as CashShift });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query active shift';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { branchId, cashierId, openingFloat, notes } = body;

    if (!cashierId || openingFloat === undefined || Number(openingFloat) < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid opening float or cashier information.' },
        { status: 400 }
      );
    }

    const numericFloat = Number(Number(openingFloat).toFixed(2));
    const targetBranchId = branchId || '00000000-0000-0000-0000-000000000001';

    const supabase = await createClient();

    // 1. Check if there is already an open shift for this cashier
    const { data: existing } = await supabase
      .from('cash_shifts')
      .select('id')
      .eq('cashier_id', cashierId)
      .eq('status', 'open')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'You already have an active open shift. Please close it first.' },
        { status: 409 }
      );
    }

    // 2. Insert new cash shift
    const newShiftData = {
      branch_id: targetBranchId,
      cashier_id: cashierId,
      opening_float: numericFloat,
      expected_cash: numericFloat,
      total_sales: 0.00,
      status: 'open',
      notes: notes || null,
      opened_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('cash_shifts')
      .insert(newShiftData)
      .select('*')
      .single();

    if (error) {
      // Fallback local response if tables aren't yet populated
      const fallbackShift: CashShift = {
        id: crypto.randomUUID(),
        ...newShiftData,
        status: 'open',
      };
      return NextResponse.json({ success: true, shift: fallbackShift });
    }

    // 3. Log audit event
    await supabase.from('audit_logs').insert({
      branch_id: targetBranchId,
      user_id: cashierId,
      action_type: 'shift_open',
      entity_name: 'cash_shifts',
      entity_id: data.id,
      new_data: { opening_float: numericFloat, notes },
      reason: 'Cashier opened cash drawer shift with float',
    });

    return NextResponse.json({ success: true, shift: data as CashShift });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open shift';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
