'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Branch } from '@/types/phase4.types';

interface BranchState {
  branches: Branch[];
  activeBranchId: string;
  activeBranch: Branch | null;
  isLoading: boolean;
  setBranches: (branches: Branch[]) => void;
  setActiveBranchId: (id: string) => void;
  fetchBranches: () => Promise<void>;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          code: 'MAIN-COLOMBO',
          name: 'Main Branch - Colombo',
          currency: 'LKR',
          timezone: 'Asia/Colombo',
          tax_rate: 0,
          service_charge_rate: 10,
          is_active: true,
        },
      ],
      activeBranchId: '00000000-0000-0000-0000-000000000001',
      activeBranch: {
        id: '00000000-0000-0000-0000-000000000001',
        code: 'MAIN-COLOMBO',
        name: 'Main Branch - Colombo',
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        tax_rate: 0,
        service_charge_rate: 10,
        is_active: true,
      },
      isLoading: false,

      setBranches: (branches) => {
        const currentActive = get().activeBranchId;
        const matched = branches.find((b) => b.id === currentActive) || branches[0] || null;
        set({
          branches,
          activeBranch: matched,
          activeBranchId: matched ? matched.id : currentActive,
        });
      },

      setActiveBranchId: (id) => {
        const matched = get().branches.find((b) => b.id === id) || null;
        set({
          activeBranchId: id,
          activeBranch: matched,
        });
      },

      fetchBranches: async () => {
        try {
          set({ isLoading: true });
          const res = await fetch('/api/branches');
          if (res.ok) {
            const data = await res.json();
            if (data.branches && data.branches.length > 0) {
              get().setBranches(data.branches);
            }
          }
        } catch (err) {
          console.error('Failed to fetch branches:', err);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'pcs_branch_storage',
      partialize: (state) => ({
        activeBranchId: state.activeBranchId,
        activeBranch: state.activeBranch,
        branches: state.branches,
      }),
    }
  )
);
