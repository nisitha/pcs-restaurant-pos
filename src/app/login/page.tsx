'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen w-full bg-[#f4fbf7] flex flex-col justify-between p-6">
      {/* Brand Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#072619] text-[#a3e04f] flex items-center justify-center font-bold border border-[#0f8a5f]/30 shadow-md">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg text-[#072619] tracking-tight block leading-none">
              PCS Bill <span className="text-[#0f8a5f]">OS</span>
            </span>
            <span className="text-[11px] text-[#4f675a] font-mono mt-1 block">
              pcsbill.com &bull; Terminal Access &bull; Colombo Branch
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5ECE8] text-xs font-bold text-[#072619] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#0f8a5f] animate-pulse" />
            <span>Hotline / WhatsApp: +94 78 76 76 576</span>
          </div>
          <Link
            href="/register"
            className="px-3.5 py-1.5 rounded-full bg-[#072619] hover:bg-[#0f8a5f] text-[#a3e04f] hover:text-white text-xs font-extrabold transition shadow-xs"
          >
            New Restaurant Signup &rarr;
          </Link>
        </div>
      </header>

      {/* Main PIN Pad Card */}
      <main className="max-w-md mx-auto w-full">
        <div className="bg-white border border-[#E5ECE8] rounded-3xl p-8 shadow-xl shadow-[#072619]/5 text-center">
          {/* Lock Icon Halo */}
          <div className="w-16 h-16 rounded-2xl bg-[#cdeeb0]/60 text-[#0f8a5f] flex items-center justify-center mx-auto mb-4 border border-[#0f8a5f]/20 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="font-display text-2xl font-extrabold text-[#072619] tracking-tight">Staff PIN Login</h2>
          <p className="text-xs text-[#4f675a] mt-1 mb-6">
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
                      ? 'bg-[#cdeeb0] border-[#0f8a5f] text-[#072619] shadow-xs'
                      : 'bg-[#f4fbf7] border-[#E5ECE8] text-[#4f675a] hover:text-[#072619] hover:bg-[#e6f6ec]'
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
        <div className="mt-4 p-4 rounded-2xl bg-white border border-[#E5ECE8] shadow-xs text-center">
          <p className="text-[11px] font-bold text-[#4f675a] uppercase tracking-wide mb-2">
            Default Demo PINs:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono font-bold">
            <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Owner: 1111</span>
            <span className="text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">Manager: 2222</span>
            <span className="text-[#072619] bg-[#cdeeb0] px-2.5 py-1 rounded-full border border-[#0f8a5f]/30">Cashier: 3333</span>
            <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">Waiter: 4444</span>
            <span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">Chef: 5555</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#4f675a] pt-4">
        <span className="font-bold text-[#072619]">PCS Bill</span> &bull; pcsbill.com &bull; Powered by Pixel Craft Studios &bull; Regional Default: LKR (Rs.)
      </footer>
    </div>
  );
}
