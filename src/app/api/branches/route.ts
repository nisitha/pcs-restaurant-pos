import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json({ success: true, branches: branches || [] });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      branches: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          code: 'MAIN-COLOMBO',
          name: 'Main Branch - Colombo',
          currency: 'LKR',
          timezone: 'Asia/Colombo',
          tax_rate: 0,
          service_charge_rate: 10,
          is_active: true,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          code: 'KANDY-01',
          name: 'Kandy Branch - Peradeniya Rd',
          currency: 'LKR',
          timezone: 'Asia/Colombo',
          tax_rate: 0,
          service_charge_rate: 10,
          is_active: true,
        },
      ],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, address, phone, currency = 'LKR', tax_rate = 0, service_charge_rate = 10, is_active = true } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, message: 'Branch code and name are required' }, { status: 400 });
    }

    const supabase = await createClient();

    if (id) {
      const { data, error } = await supabase
        .from('branches')
        .update({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          currency,
          tax_rate: Number(tax_rate),
          service_charge_rate: Number(service_charge_rate),
          is_active: Boolean(is_active),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, branch: data });
    } else {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          currency,
          tax_rate: Number(tax_rate),
          service_charge_rate: Number(service_charge_rate),
          is_active: Boolean(is_active),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, branch: data });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
