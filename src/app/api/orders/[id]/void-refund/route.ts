import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const { manager_pin, action = 'refund', reason, refund_amount, shift_id } = body;

    if (!manager_pin) {
      return NextResponse.json(
        { success: false, message: 'Manager PIN is mandatory for Void / Refund' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'A mandatory reason is required for void or refund approval' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Invoke PostgreSQL atomic RPC function
    const { data, error } = await supabase.rpc('process_order_void_or_refund', {
      p_order_id: orderId,
      p_manager_pin: manager_pin,
      p_action: action, // 'void' or 'refund'
      p_reason: reason.trim(),
      p_refund_amount: refund_amount ? Number(refund_amount) : null,
      p_shift_id: shift_id || null,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { success: false, message: data?.message || 'Void/Refund authorization failed' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
