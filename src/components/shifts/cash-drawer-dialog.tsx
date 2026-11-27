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
import { ArrowDownRight, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { DrawerActionType } from '@/types/shift.types';

interface CashDrawerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAction?: DrawerActionType;
}

export function CashDrawerDialog({
  isOpen,
  onOpenChange,
  defaultAction = 'cash_in',
}: CashDrawerDialogProps) {
  const { currentUser } = useAuthStore();
  const { activeShift, updateExpectedCash } = useShiftStore();

  const [actionType, setActionType] = useState<DrawerActionType>(defaultAction);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!reason.trim()) {
      setError('Mandatory reason is required for cash drawer transactions.');
      return;
    }

    if (!activeShift || !currentUser) {
      setError('Active shift and staff user session are required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/shifts/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          branchId: currentUser.branch_id,
          userId: currentUser.id,
          actionType,
          amount: numericAmount,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record drawer action.');
      }

      updateExpectedCash(data.delta);
      setAmount('');
      setReason('');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing transaction';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-md rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight flex items-center gap-2">
            {actionType === 'cash_in' ? (
              <span className="text-[#119C49] flex items-center gap-1.5">
                <ArrowDownRight className="w-5 h-5" /> Cash In (Add to Drawer)
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1.5">
                <ArrowUpRight className="w-5 h-5" /> Cash Out (Payout / Drop)
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-[#7C828D] text-xs">
            Record manual cash movements. Every transaction requires an authorized reason and is logged in the audit history.
          </DialogDescription>
        </DialogHeader>

        {/* Action Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F8F9FA] rounded-2xl border border-[#EBECEF] my-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setActionType('cash_in')}
            className={`text-xs font-bold rounded-xl h-9 transition ${
              actionType === 'cash_in'
                ? 'bg-[#119C49] text-white shadow-xs'
                : 'text-[#7C828D] hover:text-[#1A1D1F]'
            }`}
          >
            Cash In
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setActionType('cash_out')}
            className={`text-xs font-bold rounded-xl h-9 transition ${
              actionType === 'cash_out'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-[#7C828D] hover:text-[#1A1D1F]'
            }`}
          >
            Cash Out / Drop
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Amount (LKR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-xs font-bold text-[#7C828D]">Rs.</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                className="pl-10 bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] font-black text-lg rounded-2xl h-12 focus-visible:ring-1 focus-visible:ring-[#119C49]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Mandatory Reason <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionType === 'cash_in'
                  ? 'e.g. Float addition, change coins replenished'
                  : 'e.g. Petty cash for vegetables, bank cash drop'
              }
              className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] placeholder:text-[#7C828D] text-xs rounded-xl h-10 focus-visible:ring-1 focus-visible:ring-[#119C49]"
              required
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
              className={`font-extrabold text-white rounded-2xl h-11 px-6 shadow-sm flex-1 sm:flex-initial transition ${
                actionType === 'cash_in'
                  ? 'bg-[#119C49] hover:bg-[#0E823D]'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isLoading ? 'Processing...' : 'Confirm Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
