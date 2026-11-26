import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shiftId, branchId, userId, actionType, amount, reason } = body;

    if (!shiftId || !userId || !actionType || !amount || !reason || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount, valid action type (cash_in / cash_out), and reason are required.' },
        { status: 400 }
      );
    }

    const numericAmount = Number(Number(amount).toFixed(2));
    const targetBranchId = branchId || '00000000-0000-0000-0000-000000000001';
    const supabase = await createClient();

    // 1. Insert drawer action
    const { data: action, error: actionError } = await supabase
      .from('cash_drawer_actions')
      .insert({
        shift_id: shiftId,
        branch_id: targetBranchId,
        user_id: userId,
        action_type: actionType,
        amount: numericAmount,
        reason: reason.trim(),
      })
      .select('*')
      .single();

    // 2. Update expected cash in the cash_shifts row
    const delta = actionType === 'cash_in' ? numericAmount : -numericAmount;

    // Get current shift expected cash
    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('expected_cash')
      .eq('id', shiftId)
      .single();

    if (shift) {
      const newExpected = Number((Number(shift.expected_cash) + delta).toFixed(2));
      await supabase
        .from('cash_shifts')
        .update({ expected_cash: newExpected })
        .eq('id', shiftId);
    }

    // 3. Log to audit log
    await supabase.from('audit_logs').insert({
      branch_id: targetBranchId,
      user_id: userId,
      action_type: `shift_${actionType}`,
      entity_name: 'cash_drawer_actions',
      entity_id: action ? action.id : crypto.randomUUID(),
      new_data: { shift_id: shiftId, amount: numericAmount, reason },
      reason: `Drawer ${actionType}: ${reason}`,
    });

    return NextResponse.json({
      success: true,
      action: action || {
        id: crypto.randomUUID(),
        shift_id: shiftId,
        branch_id: targetBranchId,
        user_id: userId,
        action_type: actionType,
        amount: numericAmount,
        reason,
        created_at: new Date().toISOString(),
      },
      delta,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Drawer transaction failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
