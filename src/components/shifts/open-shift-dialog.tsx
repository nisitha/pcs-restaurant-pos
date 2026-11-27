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
import { DollarSign, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { formatLKR } from '@/lib/utils/currency';

interface OpenShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OpenShiftDialog({ isOpen, onOpenChange, onSuccess }: OpenShiftDialogProps) {
  const { currentUser } = useAuthStore();
  const { setActiveShift } = useShiftStore();

  const [floatAmount, setFloatAmount] = useState<string>('5000');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [2000, 5000, 10000];

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(floatAmount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError('Please enter a valid cash float amount.');
      return;
    }

    if (!currentUser) {
      setError('No active staff user session found.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: currentUser.branch_id,
          cashierId: currentUser.id,
          openingFloat: numericAmount,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to open shift.');
      }

      setActiveShift(data.shift);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error opening shift';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-md rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-2 shadow-xs">
            <DollarSign className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight">Open Cashier Shift</DialogTitle>
          <DialogDescription className="text-[#7C828D] text-xs">
            Enter the starting cash float inside the cash drawer before accepting customer orders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleOpenShift} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Opening Cash Float (LKR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-xs font-bold text-[#7C828D]">Rs.</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={floatAmount}
                onChange={(e) => setFloatAmount(e.target.value)}
                placeholder="5000.00"
                className="pl-10 bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] font-black text-lg rounded-2xl h-12 focus-visible:ring-1 focus-visible:ring-[#119C49]"
                required
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2">
            {presets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFloatAmount(preset.toString())}
                className="flex-1 bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] hover:bg-[#D1F0DC]/60 hover:border-[#119C49] hover:text-[#119C49] text-xs font-bold rounded-xl h-9 transition"
              >
                {formatLKR(preset)}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Shift Notes (Optional)
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning counter shift, drawer #1"
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
              className="bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold rounded-2xl h-11 px-6 shadow-sm flex-1 sm:flex-initial"
            >
              {isLoading ? 'Opening Shift...' : 'Confirm & Open Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
