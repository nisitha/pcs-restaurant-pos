import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, suppliers: suppliers || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id, name, contact_person, phone, email, address, is_active = true } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'Supplier name and phone are required' }, { status: 400 });
    }

    const branchId = '00000000-0000-0000-0000-000000000001';

    if (id) {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          name,
          contact_person: contact_person || null,
          phone,
          email: email || null,
          address: address || null,
          is_active: is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, supplier: data });
    } else {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          branch_id: branchId,
          name,
          contact_person: contact_person || null,
          phone,
          email: email || null,
          address: address || null,
          is_active: is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, supplier: data });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
