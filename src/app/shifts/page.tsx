'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { Button } from '@/components/ui/button';
import { OpenShiftDialog } from '@/components/shifts/open-shift-dialog';
import { CashDrawerDialog } from '@/components/shifts/cash-drawer-dialog';
import { CloseShiftDialog } from '@/components/shifts/close-shift-dialog';
import { formatLKR } from '@/lib/utils/currency';
import { formatRestaurantDateTime } from '@/lib/utils/datetime';
import {
  Layers,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';

export default function ShiftsPage() {
  const { currentUser } = useAuthStore();
  const { activeShift } = useShiftStore();

  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isDrawerActionOpen, setIsDrawerActionOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-amber-500" /> Cash Shift & Drawer Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Opening float tracking, manual cash-in/out records, and end-of-shift reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeShift ? (
            <Button
              onClick={() => setIsOpenShiftOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              <span>Open New Shift</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsDrawerActionOpen(true)}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5"
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                <span>Cash In / Out</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCloseShiftOpen(true)}
                className="bg-zinc-900 border-zinc-800 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Close Shift</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-xs text-zinc-400 block mb-1">Shift Status</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-lg font-bold text-emerald-400 uppercase tracking-wide">Active Open</span>
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1">
              Started: {formatRestaurantDateTime(activeShift.opened_at, 'time')}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-xs text-zinc-400 block mb-1">Opening Cash Float</span>
            <p className="text-2xl font-bold text-white">{formatLKR(activeShift.opening_float)}</p>
            <span className="text-[11px] text-zinc-500 block mt-1">Drawer Starting Amount</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-xs text-zinc-400 block mb-1">Accumulated Cash Sales</span>
            <p className="text-2xl font-bold text-white">{formatLKR(activeShift.total_sales)}</p>
            <span className="text-[11px] text-zinc-500 block mt-1">POS Sales Transactions</span>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs text-amber-400 font-semibold block mb-1">System Expected Cash</span>
            <p className="text-2xl font-black text-amber-300">{formatLKR(activeShift.expected_cash)}</p>
            <span className="text-[11px] text-amber-400/70 block mt-1">Float + Sales + Cash In - Out</span>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Active Cash Shift</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            There is no active cash drawer shift open for the current terminal. Open a shift with an initial float to begin ringing orders.
          </p>
          <Button
            onClick={() => setIsOpenShiftOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5"
          >
            <Wallet className="w-4 h-4" />
            <span>Open Cash Shift Now</span>
          </Button>
        </div>
      )}

      {/* Audit & Compliance Standards Card */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cash Reconciliation Compliance
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          In adherence to <strong>Section 6</strong> of the Restaurant POS Specification:
          All cashier shift openings, manual drawer pay-ins/pay-outs, and closing cash counts are recorded with the responsible user ID, UTC timestamp, and explicit reason. Closing shortages or overages automatically generate immutable entries in the <code className="text-amber-400 bg-zinc-800 px-1 py-0.5 rounded">audit_logs</code> table.
        </p>
      </div>

      {/* Global Dialogs */}
      <OpenShiftDialog isOpen={isOpenShiftOpen} onOpenChange={setIsOpenShiftOpen} />
      <CashDrawerDialog isOpen={isDrawerActionOpen} onOpenChange={setIsDrawerActionOpen} />
      <CloseShiftDialog isOpen={isCloseShiftOpen} onOpenChange={setIsCloseShiftOpen} />
    </div>
  );
}
