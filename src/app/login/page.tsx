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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [pin, setPin] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/staff-list')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.staff) {
          setStaffList(data.staff);
        }
      })
      .catch(() => {
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
        return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case 'manager':
        return <Shield className="w-3.5 h-3.5 text-purple-500" />;
      case 'cashier':
        return <MonitorCheck className="w-3.5 h-3.5 text-[#119C49]" />;
      case 'waiter':
        return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
      case 'chef':
        return <ChefHat className="w-3.5 h-3.5 text-orange-500" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-[#7C828D]" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F7F9] flex flex-col justify-between p-6">
      {/* Brand Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-bold border border-[#BDE8CB] shadow-sm">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base text-[#1A1D1F] tracking-tight block">
              PCS RESTAURANT POS
            </span>
            <span className="text-[10px] text-[#7C828D] font-mono">
              Terminal Access &bull; Colombo Branch
            </span>
          </div>
        </div>
      </header>

      {/* Main PIN Pad Card */}
      <main className="max-w-md mx-auto w-full">
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-8 shadow-xl text-center">
          {/* Lock Icon Halo */}
          <div className="w-16 h-16 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mx-auto mb-4 border border-[#BDE8CB] shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-extrabold text-[#1A1D1F] tracking-tight">Staff PIN Login</h2>
          <p className="text-xs text-[#7C828D] mt-1 mb-6">
            Enter your 4-digit staff PIN code to unlock your station terminal.
          </p>

          {/* Quick Staff Selection Chips */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
            {staffList.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id;
              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setSelectedStaff(isSelected ? null : staff)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-[#D1F0DC] border-[#119C49] text-[#119C49] shadow-sm'
                      : 'bg-[#F6F7F9] border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#EBECEF]'
                  }`}
                >
                  {getRoleIcon(staff.role)}
                  <span>{staff.display_name}</span>
                </button>
              );
            })}
          </div>

          {/* Keypad */}
          <PinPad
            pin={pin}
            onPinChange={setPin}
            onSubmit={handlePinSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>

        {/* Demo Fast PIN Hints */}
        <div className="mt-4 p-4 rounded-2xl bg-white border border-[#EBECEF] shadow-sm text-center">
          <p className="text-[11px] font-bold text-[#7C828D] uppercase tracking-wide mb-1.5">
            Default Demo PINs:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold">
            <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Owner: 1111</span>
            <span className="text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">Manager: 2222</span>
            <span className="text-[#119C49] bg-[#D1F0DC] px-2.5 py-1 rounded-full border border-[#BDE8CB]">Cashier: 3333</span>
            <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">Waiter: 4444</span>
            <span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">Chef: 5555</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#7C828D] pt-4">
        PCS Commercial Restaurant POS &bull; Regional Default: LKR (Rs.) &bull; Asia/Colombo
      </footer>
    </div>
  );
}
