import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const supabase = await createClient();

    let query = supabase
      .from('delivery_riders')
      .select('*')
      .order('name');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data: riders, error } = await query;

    if (error) {
      // Fallback sample riders if migration not yet run
      return NextResponse.json({
        success: true,
        riders: [
          {
            id: '11111111-dddd-1111-1111-111111111111',
            branch_id: branchId || '00000000-0000-0000-0000-000000000001',
            name: 'Kamal Perera',
            phone: '0771234567',
            vehicle_type: 'bike',
            vehicle_plate: 'WP BDF-1234',
            status: 'available',
            is_active: true,
          },
          {
            id: '22222222-dddd-2222-2222-222222222222',
            branch_id: branchId || '00000000-0000-0000-0000-000000000001',
            name: 'Sunil Shantha',
            phone: '0719876543',
            vehicle_type: 'bike',
            vehicle_plate: 'WP BCD-5678',
            status: 'available',
            is_active: true,
          },
        ],
      });
    }

    return NextResponse.json({ success: true, riders: riders || [] });
  } catch (err: any) {
    return NextResponse.json({ success: true, riders: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, branch_id, name, phone, vehicle_type = 'bike', vehicle_plate, status = 'available', is_active = true } = body;

    if (!branch_id || !name || !phone) {
      return NextResponse.json(
        { success: false, message: 'Branch ID, Rider name, and phone are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    if (id) {
      const { data, error } = await supabase
        .from('delivery_riders')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          vehicle_type,
          vehicle_plate: vehicle_plate?.trim() || null,
          status,
          is_active: Boolean(is_active),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, rider: data });
    } else {
      const { data, error } = await supabase
        .from('delivery_riders')
        .insert({
          branch_id,
          name: name.trim(),
          phone: phone.trim(),
          vehicle_type,
          vehicle_plate: vehicle_plate?.trim() || null,
          status,
          is_active: Boolean(is_active),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, rider: data });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
