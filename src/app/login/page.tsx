'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PinPad } from '@/components/auth/pin-pad';
import { useAuthStore } from '@/stores/auth-store';
import { StaffUser, UserRole } from '@/types/auth.types';
import {
  UtensilsCrossed,
  UserCheck,
  Shield,
  ChefHat,
  MonitorCheck,
  Smartphone,
  Crown,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [pin, setPin] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available staff members for quick switcher
  useEffect(() => {
    fetch('/api/auth/staff-list')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.staff) {
          setStaffList(data.staff);
        }
      })
      .catch(() => {
        // Fallback default staff
        setStaffList([
          { id: '11111111-1111-1111-1111-111111111111', display_name: 'Kasun Perera', role: 'owner', branch_id: '00000000-0000-0000-0000-000000000001' },
          { id: '22222222-2222-2222-2222-222222222222', display_name: 'Dilshan Silva', role: 'manager', branch_id: '00000000-0000-0000-0000-000000000001' },
          { id: '33333333-3333-3333-3333-333333333333', display_name: 'Nimasha Fernando', role: 'cashier', branch_id: '00000000-0000-0000-0000-000000000001' },
          { id: '44444444-4444-4444-4444-444444444444', display_name: 'Sahan Jayawardena', role: 'waiter', branch_id: '00000000-0000-0000-0000-000000000001' },
          { id: '55555555-5555-5555-5555-555555555555', display_name: 'Chef Kumara', role: 'chef', branch_id: '00000000-0000-0000-0000-000000000001' },
        ]);
      });
  }, []);

  const handlePinSubmit = async (enteredPin: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: enteredPin,
          branchId: selectedStaff?.branch_id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid PIN code.');
      }

      // Store in auth store & redirect
      login(data.user);
      router.push(data.redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'manager':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'cashier':
        return <MonitorCheck className="w-4 h-4 text-blue-400" />;
      case 'waiter':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'chef':
        return <ChefHat className="w-4 h-4 text-orange-400" />;
      default:
        return <UserCheck className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">PCS Restaurant POS</h1>
          <p className="text-xs text-zinc-400 mt-1">Enter your 4-digit staff PIN code to sign in</p>
        </div>

        {/* Staff Quick Selectors */}
        <div className="mb-6">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 text-center">
            {selectedStaff ? `Logging in as: ${selectedStaff.display_name}` : 'Select Staff Account (Optional)'}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {staffList.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id;
              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaff(isSelected ? null : staff);
                    setPin('');
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <div className="mb-1">{getRoleIcon(staff.role)}</div>
                  <span className="text-[11px] font-semibold truncate w-full leading-tight">
                    {staff.display_name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono capitalize">{staff.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Pad Component */}
        <PinPad
          pin={pin}
          maxDigits={4}
          onPinChange={(newPin) => {
            setPin(newPin);
            setErrorMessage(null);
          }}
          onSubmit={handlePinSubmit}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        {/* Test PINs Helper Card */}
        <div className="mt-8 pt-4 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500 font-medium mb-1.5">Default Testing PINs:</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-zinc-400">
            <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-800">Owner: 1111</span>
            <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-800">Manager: 2222</span>
            <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-800 font-semibold text-blue-400">Cashier: 3333</span>
            <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-800">Waiter: 4444</span>
            <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-800">Chef: 5555</span>
          </div>
        </div>
      </div>
    </div>
  );
}
