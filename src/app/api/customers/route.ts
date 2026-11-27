import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    let dbQuery = supabase
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
          points_change,
          transaction_type,
          notes,
          created_at
        )
      `)
      .order('total_spent', { ascending: false });

    if (query && query.trim() !== '') {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    const { data: customers, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, customers: customers || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id, name, phone, email, delivery_address, tier = 'Regular', notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'Customer name and phone are required' }, { status: 400 });
    }

    const branchId = '00000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();

    if (id) {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          email: email || null,
          delivery_address: delivery_address || null,
          tier,
          notes: notes || null,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, customer: data });
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          branch_id: branchId,
          name,
          phone,
          email: email || null,
          delivery_address: delivery_address || null,
          tier,
          loyalty_points: 0,
          total_spent: 0.00,
          notes: notes || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, customer: data });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
