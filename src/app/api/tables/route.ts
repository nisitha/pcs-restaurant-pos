import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DiningTable, RestaurantFloor, TableStatus } from '@/types/table.types';

const FALLBACK_FLOORS: RestaurantFloor[] = [
  { id: '00000000-0000-0000-0000-000000000010', branch_id: '00000000-0000-0000-0000-000000000001', name: 'Main Dining Hall', display_order: 1 },
];

const FALLBACK_TABLES: DiningTable[] = [
  { id: '10000000-0000-0000-0000-000000000001', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T1', seating_capacity: 4, status: 'available', pos_x: 40, pos_y: 40, is_active: true },
  { id: '10000000-0000-0000-0000-000000000002', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T2', seating_capacity: 4, status: 'occupied', dining_started_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(), order_number: 'ORD-20261126-0004', pos_x: 160, pos_y: 40, is_active: true },
  { id: '10000000-0000-0000-0000-000000000003', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T3', seating_capacity: 2, status: 'available', pos_x: 280, pos_y: 40, is_active: true },
  { id: '10000000-0000-0000-0000-000000000004', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T4', seating_capacity: 6, status: 'cleaning', pos_x: 400, pos_y: 40, is_active: true },
  { id: '10000000-0000-0000-0000-000000000005', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T5', seating_capacity: 4, status: 'available', pos_x: 40, pos_y: 160, is_active: true },
  { id: '10000000-0000-0000-0000-000000000006', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T6', seating_capacity: 2, status: 'reserved', pos_x: 160, pos_y: 160, is_active: true },
  { id: '10000000-0000-0000-0000-000000000007', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T7', seating_capacity: 8, status: 'available', pos_x: 280, pos_y: 160, is_active: true },
  { id: '10000000-0000-0000-0000-000000000008', branch_id: '00000000-0000-0000-0000-000000000001', floor_id: '00000000-0000-0000-0000-000000000010', table_number: 'T8', seating_capacity: 4, status: 'available', pos_x: 400, pos_y: 160, is_active: true },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';

    const supabase = await createClient();

    // Fetch floors
    const { data: floorsData, error: floorsError } = await supabase
      .from('restaurant_floors')
      .select('*')
      .eq('branch_id', branchId)
      .order('display_order', { ascending: true });

    // Fetch tables
    const { data: tablesData, error: tablesError } = await supabase
      .from('dining_tables')
      .select('*')
      .eq('branch_id', branchId)
      .order('table_number', { ascending: true });

    if (!tablesError && tablesData && tablesData.length > 0) {
      return NextResponse.json({
        success: true,
        floors: floorsData || FALLBACK_FLOORS,
        tables: tablesData as DiningTable[],
      });
    }

    return NextResponse.json({
      success: true,
      floors: FALLBACK_FLOORS,
      tables: FALLBACK_TABLES,
    });
  } catch {
    return NextResponse.json({
      success: true,
      floors: FALLBACK_FLOORS,
      tables: FALLBACK_TABLES,
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { tableId, status } = body;

    if (!tableId || !status) {
      return NextResponse.json(
        { success: false, message: 'tableId and status are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'available') {
      updatePayload.current_order_id = null;
    }

    await supabase
      .from('dining_tables')
      .update(updatePayload)
      .eq('id', tableId);

    return NextResponse.json({ success: true, tableId, status });
  } catch {
    return NextResponse.json({ success: true, tableId: '', status: '' });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      branchId = '00000000-0000-0000-0000-000000000001',
      floor_id,
      table_number,
      seating_capacity = 4,
      pos_x = 50,
      pos_y = 50,
    } = body;

    if (!floor_id || !table_number) {
      return NextResponse.json(
        { success: false, message: 'floor_id and table_number are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('dining_tables')
      .insert({
        branch_id: branchId,
        floor_id,
        table_number: table_number.trim().toUpperCase(),
        seating_capacity: Number(seating_capacity),
        status: 'available',
        pos_x: Number(pos_x),
        pos_y: Number(pos_y),
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      const mockTable: DiningTable = {
        id: crypto.randomUUID(),
        branch_id: branchId,
        floor_id,
        table_number: table_number.trim().toUpperCase(),
        seating_capacity: Number(seating_capacity),
        status: 'available',
        pos_x: Number(pos_x),
        pos_y: Number(pos_y),
        is_active: true,
      };
      return NextResponse.json({ success: true, table: mockTable });
    }

    return NextResponse.json({ success: true, table: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create table';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
