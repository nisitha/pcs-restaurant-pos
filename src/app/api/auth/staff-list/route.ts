import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/types/auth.types';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Try querying user_profiles from DB
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, role, branch_id')
      .eq('is_active', true)
      .order('role', { ascending: true });

    if (!error && data && data.length > 0) {
      return NextResponse.json({
        success: true,
        staff: data.map((d) => ({
          id: d.id,
          display_name: d.display_name,
          role: d.role as UserRole,
          branch_id: d.branch_id,
        })),
      });
    }

    // 2. Fallback to predefined seed staff list
    const fallbackStaff = [
      { id: '11111111-1111-1111-1111-111111111111', display_name: 'Kasun Perera (Owner)', role: 'owner' as UserRole, branch_id: '00000000-0000-0000-0000-000000000001' },
      { id: '22222222-2222-2222-2222-222222222222', display_name: 'Dilshan Silva (Manager)', role: 'manager' as UserRole, branch_id: '00000000-0000-0000-0000-000000000001' },
      { id: '33333333-3333-3333-3333-333333333333', display_name: 'Nimasha Fernando (Cashier)', role: 'cashier' as UserRole, branch_id: '00000000-0000-0000-0000-000000000001' },
      { id: '44444444-4444-4444-4444-444444444444', display_name: 'Sahan Jayawardena (Waiter)', role: 'waiter' as UserRole, branch_id: '00000000-0000-0000-0000-000000000001' },
      { id: '55555555-5555-5555-5555-555555555555', display_name: 'Chef Kumara (Kitchen)', role: 'chef' as UserRole, branch_id: '00000000-0000-0000-0000-000000000001' },
    ];

    return NextResponse.json({ success: true, staff: fallbackStaff });
  } catch {
    return NextResponse.json({ success: true, staff: [] });
  }
}
