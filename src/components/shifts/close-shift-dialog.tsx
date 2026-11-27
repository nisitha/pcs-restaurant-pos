'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { formatLKR } from '@/lib/utils/currency';

interface CloseShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CloseShiftDialog({ isOpen, onOpenChange, onSuccess }: CloseShiftDialogProps) {
  const { currentUser } = useAuthStore();
  const { activeShift, clearActiveShift } = useShiftStore();

  const [countedCash, setCountedCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeShift) return null;

  const expected = Number(activeShift.expected_cash || 0);
  const counted = parseFloat(countedCash) || 0;
  const variance = Number((counted - expected).toFixed(2));
  const hasVariance = countedCash.trim() !== '' && Math.abs(variance) > 0.01;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (countedCash.trim() === '' || isNaN(counted) || counted < 0) {
      setError('Please input the actual physical counted cash in the drawer.');
      return;
    }

    if (!currentUser) {
      setError('No active staff user session found.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          branchId: currentUser.branch_id,
          cashierId: currentUser.id,
          actualCash: counted,
          notes: closingNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to close shift.');
      }

      clearActiveShift();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error closing shift';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-lg rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight">Close Cashier Shift & Reconcile</DialogTitle>
          <DialogDescription className="text-[#7C828D] text-xs">
            Count the total physical cash in the drawer and input below to calculate any shortage or overage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCloseShift} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-2xl">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF] space-y-2 text-sm">
            <div className="flex justify-between text-[#7C828D]">
              <span>Opening Cash Float:</span>
              <span className="font-bold text-[#1A1D1F]">{formatLKR(activeShift.opening_float)}</span>
            </div>
            <div className="flex justify-between text-[#7C828D]">
              <span>Cash Sales Accumulated:</span>
              <span className="font-bold text-[#1A1D1F]">{formatLKR(activeShift.total_sales)}</span>
            </div>
            <div className="border-t border-[#EBECEF] pt-2 flex justify-between font-bold text-base">
              <span className="text-[#1A1D1F]">System Expected Cash:</span>
              <span className="text-[#119C49] font-black">{formatLKR(expected)}</span>
            </div>
          </div>

          {/* Counted Cash Input */}
          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Actual Physical Counted Cash (LKR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-xs font-bold text-[#7C828D]">Rs.</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="0.00"
                className="pl-10 bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] font-black text-xl rounded-2xl h-12 focus-visible:ring-1 focus-visible:ring-[#119C49]"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Variance Status Display */}
          {countedCash.trim() !== '' && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                Math.abs(variance) < 0.01
                  ? 'bg-[#D1F0DC]/60 border-[#119C49]/40 text-[#119C49]'
                  : variance < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {Math.abs(variance) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#119C49]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span className="font-bold">
                  {Math.abs(variance) < 0.01
                    ? 'Balanced Drawer'
                    : variance < 0
                    ? 'Cash Shortage Detected'
                    : 'Cash Overage Detected'}
                </span>
              </div>
              <span className="font-mono font-black text-sm">
                {variance >= 0 ? '+' : ''}
                {formatLKR(variance)}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Closing Remarks / Reason for Discrepancy
            </label>
            <Input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="e.g. Balanced drawer count verified by manager"
              className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] placeholder:text-[#7C828D] text-xs rounded-xl h-10 focus-visible:ring-1 focus-visible:ring-[#119C49]"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#EBECEF] flex sm:flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F8F9FA] rounded-2xl h-11 px-5 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl h-11 px-6 shadow-sm flex-1 sm:flex-initial"
            >
              {isLoading ? 'Reconciling...' : 'Confirm & Close Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
