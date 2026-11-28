'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PinPad } from '@/components/auth/pin-pad';
import { useAuthStore } from '@/stores/auth-store';
import { StaffUser, UserRole } from '@/types/auth.types';
import { Tilt3DCard, Floating3DElement, PulseBeacon } from '@/components/ui/Motion3D';
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
        return <MonitorCheck className="w-3.5 h-3.5 text-[#0f8a5f]" />;
      case 'waiter':
        return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
      case 'chef':
        return <ChefHat className="w-3.5 h-3.5 text-orange-500" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-[#4f675a]" />;
    }
  };

  const terminalStations = [
    {
      role: 'cashier' as UserRole,
      title: 'Counter POS',
      subtitle: 'Cashier Terminal',
      pin: '3333',
      img: '/images/3d/pos-terminal-3d.jpg',
      badge: '10s Billing',
    },
    {
      role: 'chef' as UserRole,
      title: 'Kitchen KDS',
      subtitle: 'Prep Display',
      pin: '5555',
      img: '/images/3d/kds-screen-3d.jpg',
      badge: 'Live Tickets',
    },
    {
      role: 'waiter' as UserRole,
      title: 'Captain Tab',
      subtitle: 'Waiter Floor',
      pin: '4444',
      img: '/images/3d/captain-tab-3d.jpg',
      badge: 'Table Flow',
    },
    {
      role: 'owner' as UserRole,
      title: 'Owner BI',
      subtitle: 'Manager Hub',
      pin: '1111',
      img: '/images/3d/icon-analytics-3d.svg',
      badge: 'Control Tower',
    },
  ];

  const handleSelectTerminalStation = (role: UserRole) => {
    const matched = staffList.find((s) => s.role === role) || null;
    setSelectedStaff(matched);
  };

  return (
    <div className="min-h-screen w-full bg-[#f4fbf7] flex flex-col justify-between p-5 sm:p-6">
      {/* Brand Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-4">
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
            <PulseBeacon color="#0f8a5f" size="sm" />
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

      {/* Main Split Workspace: 3D Terminal Mode Cards + Staff PIN Pad */}
      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto py-2">
        {/* Left: 3D Terminal Station Showcase (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#cdeeb0] text-[#072619] text-[11px] font-extrabold uppercase tracking-wider">
              <PulseBeacon color="#0f8a5f" size="sm" />
              <span>Select Terminal Mode</span>
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#072619] tracking-tight">
              Choose Your Station &amp; Unlock
            </h1>
            <p className="text-xs text-[#4f675a]">
              Tap a 3D station card below to pre-select your terminal role, or enter your 4-digit staff PIN directly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            {terminalStations.map((stn, idx) => {
              const isSelected =
                selectedStaff?.role === stn.role ||
                (stn.role === 'owner' && selectedStaff?.role === 'manager');

              return (
                <Tilt3DCard key={stn.role} maxTilt={7} className="rounded-3xl">
                  <button
                    type="button"
                    onClick={() => handleSelectTerminalStation(stn.role)}
                    className={`w-full h-full text-left p-4 rounded-3xl bg-white border transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-sm ${
                      isSelected
                        ? 'pcs-fx-ring border-[#0f8a5f] ring-2 ring-[#0f8a5f]/20 bg-[#f4fbf7]'
                        : 'border-[#E5ECE8] hover:border-[#0f8a5f]/40 pcs-brand-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Floating3DElement amplitude={5} rotate={2} duration={4.8} delay={idx * 0.35}>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#f4fbf7] border border-[#E5ECE8] shadow-sm flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={stn.img}
                            alt={stn.title}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      </Floating3DElement>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          isSelected
                            ? 'bg-[#072619] text-[#a3e04f]'
                            : 'bg-[#f4fbf7] text-[#0f8a5f] border border-[#E5ECE8]'
                        }`}
                      >
                        {stn.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-base font-black text-[#072619] leading-tight">
                        {stn.title}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-semibold text-[#4f675a]">{stn.subtitle}</span>
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-[#cdeeb0]/60 text-[#072619]">
                          PIN {stn.pin}
                        </span>
                      </div>
                    </div>
                  </button>
                </Tilt3DCard>
              );
            })}
          </div>
        </section>

        {/* Right: PIN Pad Card (5 cols) */}
        <section className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white border border-[#E5ECE8] rounded-3xl p-6 sm:p-7 shadow-xl shadow-[#072619]/5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#cdeeb0]/60 text-[#0f8a5f] flex items-center justify-center mx-auto mb-3 border border-[#0f8a5f]/20 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>

            <h2 className="font-display text-xl font-extrabold text-[#072619] tracking-tight">
              Staff PIN Login
            </h2>
            <p className="text-xs text-[#4f675a] mt-1 mb-4">
              {selectedStaff
                ? `Unlocking as ${selectedStaff.display_name} (${selectedStaff.role})`
                : 'Enter your 4-digit staff PIN code to unlock terminal.'}
            </p>

            {/* Quick Staff Selection Chips */}
            <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5">
              {staffList.map((staff) => {
                const isSelected = selectedStaff?.id === staff.id;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaff(isSelected ? null : staff)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition border cursor-pointer ${
                      isSelected
                        ? 'bg-[#cdeeb0] border-[#0f8a5f] text-[#072619] shadow-xs'
                        : 'bg-[#f4fbf7] border-[#E5ECE8] text-[#4f675a] hover:text-[#072619]'
                    }`}
                  >
                    {getRoleIcon(staff.role)}
                    <span>{staff.display_name}</span>
                  </button>
                );
              })}
            </div>

            <PinPad
              pin={pin}
              onPinChange={setPin}
              onSubmit={handlePinSubmit}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#4f675a] pt-4">
        <span className="font-bold text-[#072619]">PCS Bill</span> &bull; pcsbill.com &bull; Powered by Pixel Craft Studios &bull; Regional Default: LKR (Rs.)
      </footer>
    </div>
  );
}
