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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <DialogTitle className="text-xl font-bold">Open Cashier Shift</DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Enter the starting cash float inside the cash drawer before accepting customer orders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleOpenShift} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Opening Cash Float (LKR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">Rs.</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={floatAmount}
                onChange={(e) => setFloatAmount(e.target.value)}
                placeholder="5000.00"
                className="pl-10 bg-zinc-900 border-zinc-800 text-white font-semibold text-lg"
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
                className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs"
              >
                {formatLKR(preset)}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Shift Notes (Optional)
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning counter shift, drawer #1"
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {isLoading ? 'Opening Shift...' : 'Confirm & Open Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
