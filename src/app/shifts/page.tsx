'use client';

import React, { useState } from 'react';
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
    <div className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EBECEF] pb-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-[#119C49]" /> Accounting & Shifts
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Opening float tracking, manual cash-in/out records, and end-of-shift reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeShift ? (
            <Button
              onClick={() => setIsOpenShiftOpen(true)}
              className="bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-full gap-1.5 shadow-md shadow-[#119C49]/20"
            >
              <Wallet className="w-4 h-4" />
              <span>Open New Shift</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsDrawerActionOpen(true)}
                className="bg-white border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F6F7F9] text-xs font-bold rounded-full gap-1.5"
              >
                <ArrowDownRight className="w-4 h-4 text-[#119C49]" />
                <span>Cash In / Out</span>
              </Button>
              <Button
                onClick={() => setIsCloseShiftOpen(true)}
                className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-full gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Close Shift</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Shift Card or Empty State */}
      {activeShift ? (
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-6 shadow-sm mb-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#F4F5F7] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-[#1A1D1F]">Active Cashier Shift</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D1F0DC] text-[#119C49]">
                    OPEN
                  </span>
                </div>
                <p className="text-xs text-[#7C828D]">
                  Opened on {formatRestaurantDateTime(activeShift.opened_at)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#7C828D]">Cashier:</span>
              <p className="text-sm font-bold text-[#1A1D1F]">{currentUser?.display_name || 'Active Cashier'}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]">
              <p className="text-xs text-[#7C828D]">Opening Cash Float</p>
              <p className="text-xl font-black text-[#1A1D1F] font-mono mt-1">
                {formatLKR(activeShift.opening_float)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]">
              <p className="text-xs text-[#7C828D]">Total Cash Sales</p>
              <p className="text-xl font-black text-[#119C49] font-mono mt-1">
                {formatLKR(activeShift.total_sales || 0)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#D1F0DC] border border-[#BDE8CB]">
              <p className="text-xs text-[#119C49] font-bold">Expected Cash in Drawer</p>
              <p className="text-xl font-black text-[#119C49] font-mono mt-1">
                {formatLKR(activeShift.expected_cash || activeShift.opening_float)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-[#EBECEF] shadow-sm mb-8">
          <Wallet className="w-12 h-12 text-[#7C828D]/50 mb-3" />
          <h3 className="text-base font-extrabold text-[#1A1D1F] mb-1">No Active Shift Opened</h3>
          <p className="text-xs text-[#7C828D] max-w-sm mb-4">
            Open a shift and register your opening float to enable cash order billing and drawer balance tracking.
          </p>
          <Button
            onClick={() => setIsOpenShiftOpen(true)}
            className="bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-full gap-2 shadow-md shadow-[#119C49]/20"
          >
            <Wallet className="w-4 h-4" />
            <span>Open Shift Now</span>
          </Button>
        </div>
      )}

      {/* Global Shift Dialogs */}
      <OpenShiftDialog isOpen={isOpenShiftOpen} onOpenChange={setIsOpenShiftOpen} />
      <CashDrawerDialog isOpen={isDrawerActionOpen} onOpenChange={setIsDrawerActionOpen} />
      <CloseShiftDialog isOpen={isCloseShiftOpen} onOpenChange={setIsCloseShiftOpen} />
    </div>
  );
}
