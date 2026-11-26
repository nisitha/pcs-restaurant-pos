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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 border border-amber-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <DialogTitle className="text-xl font-bold">Close Cashier Shift & Reconcile</DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Count the total cash in the cash drawer and input below to calculate any shortage or overage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCloseShift} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Breakdown Card */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Opening Cash Float:</span>
              <span className="font-medium text-white">{formatLKR(activeShift.opening_float)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Cash Sales Accumulated:</span>
              <span className="font-medium text-white">{formatLKR(activeShift.total_sales)}</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-base">
              <span className="text-zinc-200">System Expected Cash:</span>
              <span className="text-amber-400">{formatLKR(expected)}</span>
            </div>
          </div>

          {/* Counted Cash Input */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Actual Physical Counted Cash (LKR) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">Rs.</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="0.00"
                className="pl-10 bg-zinc-900 border-zinc-800 text-white font-bold text-xl"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Variance Status Display */}
          {countedCash.trim() !== '' && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                Math.abs(variance) < 0.01
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : variance < 0
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {Math.abs(variance) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span className="font-semibold">
                  {Math.abs(variance) < 0.01
                    ? 'Balanced Drawer'
                    : variance < 0
                    ? 'Cash Shortage Detected'
                    : 'Cash Overage Detected'}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                {variance >= 0 ? '+' : ''}
                {formatLKR(variance)}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Closing Remarks / Reason for Discrepancy
            </label>
            <Input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="e.g. Balanced drawer count verified by manager"
              className="bg-zinc-900 border-zinc-800 text-white text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              {isLoading ? 'Reconciling...' : 'Confirm & Close Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
