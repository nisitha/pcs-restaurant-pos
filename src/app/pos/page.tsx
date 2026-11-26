'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { Button } from '@/components/ui/button';
import { OpenShiftDialog } from '@/components/shifts/open-shift-dialog';
import { CashDrawerDialog } from '@/components/shifts/cash-drawer-dialog';
import { CloseShiftDialog } from '@/components/shifts/close-shift-dialog';
import { formatLKR } from '@/lib/utils/currency';
import {
  Wallet,
  AlertTriangle,
  ArrowDownRight,
  Lock,
  ShoppingBag,
  Sparkles,
  Search,
  Grid,
} from 'lucide-react';

export default function PosPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { activeShift, hasActiveShift, setActiveShift } = useShiftStore();

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth session
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login');
      return;
    }

    // Fetch active shift from API
    fetch(`/api/shifts?cashierId=${currentUser.id}&branchId=${currentUser.branch_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.shift) {
          setActiveShift(data.shift);
        }
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, currentUser, router, setActiveShift]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Gatekeeper: Require an open shift for Cashiers before POS billing is unlocked!
  if (!hasActiveShift || !activeShift) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Cash Shift Required</h2>
          <p className="text-sm text-zinc-400 mb-6">
            To prevent unaccounted transactions, cashier counter billing requires an active shift with an opening cash float.
          </p>
          <Button
            size="lg"
            onClick={() => setIsOpenShiftModalOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Wallet className="w-5 h-5" />
            <span>Open Shift with Cash Float</span>
          </Button>

          <OpenShiftDialog
            isOpen={isOpenShiftModalOpen}
            onOpenChange={setIsOpenShiftModalOpen}
            onSuccess={() => setIsOpenShiftModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Top Shift Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 mb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Cashier Shift
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">Counter Terminal #1</h2>
          <p className="text-xs text-zinc-400">
            Cashier: <strong className="text-white">{currentUser?.display_name}</strong> &bull; Float:{' '}
            <strong className="text-white">{formatLKR(activeShift.opening_float)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDrawerModalOpen(true)}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white text-xs gap-1.5"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            <span>Cash In / Out</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCloseShiftModalOpen(true)}
            className="bg-zinc-800 border-zinc-700 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs gap-1.5"
          >
            <Lock className="w-4 h-4" />
            <span>Close Shift</span>
          </Button>
        </div>
      </div>

      {/* POS Ready Placeholder Banner */}
      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">POS Billing Station Ready</h3>
        <p className="text-sm text-zinc-400 max-w-md mb-6">
          Shift is open with expected drawer cash: <strong className="text-amber-400">{formatLKR(activeShift.expected_cash)}</strong>.
          Menu catalog rendering and fast-order cart ringing are queued for Milestone 1.3 & 1.5.
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 text-xs"
            onClick={() => router.push('/shifts')}
          >
            View Drawer Ledger
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            onClick={() => router.push('/admin/dashboard')}
          >
            Management Dashboard
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <CashDrawerDialog isOpen={isDrawerModalOpen} onOpenChange={setIsDrawerModalOpen} />
      <CloseShiftDialog isOpen={isCloseShiftModalOpen} onOpenChange={setIsCloseShiftModalOpen} />
    </div>
  );
}
