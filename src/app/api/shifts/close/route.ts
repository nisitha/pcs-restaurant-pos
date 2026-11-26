import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shiftId, branchId, cashierId, actualCash, notes } = body;

    if (!shiftId || actualCash === undefined || Number(actualCash) < 0) {
      return NextResponse.json(
        { success: false, message: 'Shift ID and valid counted cash amount are required.' },
        { status: 400 }
      );
    }

    const countedCash = Number(Number(actualCash).toFixed(2));
    const targetBranchId = branchId || '00000000-0000-0000-0000-000000000001';
    const supabase = await createClient();

    // 1. Fetch current shift
    const { data: shift, error: fetchError } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    const expectedCash = shift ? Number(shift.expected_cash) : countedCash;
    const cashVariance = Number((countedCash - expectedCash).toFixed(2));

    // 2. Update shift to closed
    const closeTimestamp = new Date().toISOString();
    const updatePayload = {
      actual_cash: countedCash,
      cash_variance: cashVariance,
      closed_at: closeTimestamp,
      status: 'closed',
      notes: notes || shift?.notes || null,
    };

    if (!fetchError && shift) {
      await supabase
        .from('cash_shifts')
        .update(updatePayload)
        .eq('id', shiftId);
    }

    // 3. Immutable audit log record
    await supabase.from('audit_logs').insert({
      branch_id: targetBranchId,
      user_id: cashierId,
      action_type: 'shift_close',
      entity_name: 'cash_shifts',
      entity_id: shiftId,
      new_data: {
        expected_cash: expectedCash,
        actual_cash: countedCash,
        cash_variance: cashVariance,
        closed_at: closeTimestamp,
      },
      reason: `Shift closed. Variance: ${cashVariance >= 0 ? '+' : ''}${cashVariance} LKR`,
    });

    return NextResponse.json({
      success: true,
      message: 'Cash shift closed successfully.',
      shift: {
        id: shiftId,
        ...shift,
        ...updatePayload,
      },
      variance: cashVariance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to close cash shift';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
