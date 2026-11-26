'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  LogOut,
  Lock,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  MonitorCheck,
  ChefHat,
  Smartphone,
  LayoutDashboard,
  Layers,
  Utensils,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { OpenShiftDialog } from '@/components/shifts/open-shift-dialog';
import { CashDrawerDialog } from '@/components/shifts/cash-drawer-dialog';
import { CloseShiftDialog } from '@/components/shifts/close-shift-dialog';
import { formatLKR } from '@/lib/utils/currency';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuthStore();
  const { activeShift, hasActiveShift } = useShiftStore();

  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isDrawerActionOpen, setIsDrawerActionOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);

  // Hide nav on login page
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/pos', label: 'POS Billing', icon: MonitorCheck, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
    { href: '/tables', label: 'Floor Plan', icon: Grid3X3, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
    { href: '/kds', label: 'Kitchen KDS', icon: ChefHat, roles: ['chef', 'manager', 'owner', 'super_admin'] },
    { href: '/waiter', label: 'Waiter Panel', icon: Smartphone, roles: ['waiter', 'manager', 'owner', 'super_admin'] },
    { href: '/admin/menu', label: 'Menu Catalog', icon: Utensils, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/shifts', label: 'Shifts & Drawer', icon: Layers, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'owner', 'super_admin'] },
  ];

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    manager: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cashier: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    waiter: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    chef: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    super_admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-base text-white tracking-tight">PCS POS</span>
                <span className="block text-[10px] text-zinc-400 font-mono">Colombo Branch</span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const isPermitted = !currentUser || link.roles.includes(currentUser.role);

                if (!isPermitted) return null;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Shift Badge + Staff Profile + Lock */}
          <div className="flex items-center gap-3">
            {/* Shift Status Indicator */}
            {currentUser && (currentUser.role === 'cashier' || currentUser.role === 'manager' || currentUser.role === 'owner') && (
              <div className="relative">
                {hasActiveShift && activeShift ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShiftDropdownOpen(!shiftDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Shift Open: {formatLKR(activeShift.expected_cash)}</span>
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                    </button>

                    {/* Shift Dropdown Menu */}
                    {shiftDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                          <p className="text-[11px] text-zinc-400">Current Cash Expected</p>
                          <p className="text-base font-bold text-white">{formatLKR(activeShift.expected_cash)}</p>
                          <p className="text-[10px] text-zinc-500">Float: {formatLKR(activeShift.opening_float)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShiftDropdownOpen(false);
                            setIsDrawerActionOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition"
                        >
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          <span>Cash In / Cash Out</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShiftDropdownOpen(false);
                            setIsCloseShiftOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Close Shift & Reconcile</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsOpenShiftOpen(true)}
                    className="h-8 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Open Shift</span>
                  </Button>
                )}
              </div>
            )}

            {/* Active Staff User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white leading-tight">{currentUser.display_name}</p>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                      roleColors[currentUser.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  title="Switch Staff / Lock Screen"
                  className="h-9 px-3 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-semibold gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>PIN Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Dialogs */}
      <OpenShiftDialog isOpen={isOpenShiftOpen} onOpenChange={setIsOpenShiftOpen} />
      <CashDrawerDialog isOpen={isDrawerActionOpen} onOpenChange={setIsDrawerActionOpen} />
      <CloseShiftDialog isOpen={isCloseShiftOpen} onOpenChange={setIsCloseShiftOpen} />
    </>
  );
}
