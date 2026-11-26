import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/types/auth.types';

function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case 'cashier':
      return '/pos';
    case 'waiter':
      return '/waiter';
    case 'chef':
      return '/kds';
    case 'owner':
    case 'manager':
    case 'super_admin':
      return '/admin/dashboard';
    default:
      return '/pos';
  }
}

export async function POST(request: Request) {
  try {
    const { pin, branchId } = await request.json();

    if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid 4-digit PIN.' },
        { status: 400 }
      );
    }

    const cleanPin = pin.trim();
    const supabase = await createClient();

    // 1. Try calling the verify_staff_pin RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('verify_staff_pin', {
      p_pin: cleanPin,
      p_branch_id: branchId || null,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const staff = rpcData[0];
      const user = {
        id: staff.user_id,
        display_name: staff.display_name,
        role: staff.role as UserRole,
        branch_id: staff.branch_id || '00000000-0000-0000-0000-000000000001',
      };

      // Log session login
      await supabase.from('user_sessions_log').insert({
        branch_id: user.branch_id,
        user_id: user.id,
        action: 'login',
        device_info: request.headers.get('user-agent') || 'POS Terminal',
      });

      return NextResponse.json({
        success: true,
        user,
        redirectUrl: getRoleRedirect(user.role),
      });
    }

    // 2. Fallback check for testing seed accounts if RPC is not yet executed in Supabase
    // Standard test PINs: 1111 (Owner), 2222 (Manager), 3333 (Cashier), 4444 (Waiter), 5555 (Chef)
    const testPinUsers: Record<string, { id: string; display_name: string; role: UserRole }> = {
      '1111': { id: '11111111-1111-1111-1111-111111111111', display_name: 'Kasun Perera (Owner)', role: 'owner' },
      '2222': { id: '22222222-2222-2222-2222-222222222222', display_name: 'Dilshan Silva (Manager)', role: 'manager' },
      '3333': { id: '33333333-3333-3333-3333-333333333333', display_name: 'Nimasha Fernando (Cashier)', role: 'cashier' },
      '4444': { id: '44444444-4444-4444-4444-444444444444', display_name: 'Sahan Jayawardena (Waiter)', role: 'waiter' },
      '5555': { id: '55555555-5555-5555-5555-555555555555', display_name: 'Chef Kumara (Kitchen)', role: 'chef' },
    };

    if (testPinUsers[cleanPin]) {
      const match = testPinUsers[cleanPin];
      const user = {
        id: match.id,
        display_name: match.display_name,
        role: match.role,
        branch_id: branchId || '00000000-0000-0000-0000-000000000001',
      };

      return NextResponse.json({
        success: true,
        user,
        redirectUrl: getRoleRedirect(user.role),
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid PIN. Access denied.' },
      { status: 401 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
