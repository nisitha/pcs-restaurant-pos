import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id,
        branch_id,
        name,
        phone,
        email,
        delivery_address,
        tier,
        loyalty_points,
        total_spent,
        notes,
        created_at,
        updated_at,
        transactions:loyalty_transactions (
          id,
          order_id,
          points_change,
          transaction_type,
          notes,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !customer) {
      return NextResponse.json({ success: false, message: error?.message || 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
