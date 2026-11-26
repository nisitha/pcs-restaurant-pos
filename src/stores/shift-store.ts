'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CashShift } from '@/types/shift.types';

interface ShiftState {
  activeShift: CashShift | null;
  hasActiveShift: boolean;
  setActiveShift: (shift: CashShift | null) => void;
  clearActiveShift: () => void;
  updateExpectedCash: (amountToAddOrSubtract: number) => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      activeShift: null,
      hasActiveShift: false,

      setActiveShift: (shift: CashShift | null) => {
        set({
          activeShift: shift,
          hasActiveShift: Boolean(shift && shift.status === 'open'),
        });
      },

      clearActiveShift: () => {
        set({
          activeShift: null,
          hasActiveShift: false,
        });
      },

      updateExpectedCash: (delta: number) => {
        const current = get().activeShift;
        if (!current) return;

        const updated: CashShift = {
          ...current,
          expected_cash: Number((current.expected_cash + delta).toFixed(2)),
        };

        set({ activeShift: updated });
      },
    }),
    {
      name: 'pcs-pos-active-shift',
    }
  )
);
