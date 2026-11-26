'use client';

import { create } from 'zustand';
import { DiningTable, RestaurantFloor, TableStatus } from '@/types/table.types';

interface TableState {
  floors: RestaurantFloor[];
  tables: DiningTable[];
  activeFloorId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchTables: (branchId?: string) => Promise<void>;
  setActiveFloorId: (floorId: string) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<boolean>;
  saveTable: (table: Partial<DiningTable>) => Promise<boolean>;
}

export const useTableStore = create<TableState>()((set, get) => ({
  floors: [],
  tables: [],
  activeFloorId: null,
  isLoading: false,
  error: null,

  fetchTables: async (branchId = '00000000-0000-0000-0000-000000000001') => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch(`/api/tables?branchId=${branchId}`);
      if (!res.ok) throw new Error('Failed to fetch tables');

      const data = await res.json();
      if (data.success) {
        set({
          floors: data.floors || [],
          tables: data.tables || [],
          activeFloorId: get().activeFloorId || (data.floors[0]?.id ?? null),
          isLoading: false,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching tables';
      set({ error: msg, isLoading: false });
    }
  },

  setActiveFloorId: (floorId: string) => {
    set({ activeFloorId: floorId });
  },

  updateTableStatus: async (tableId: string, status: TableStatus) => {
    // 1. Optimistic update
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status,
              dining_started_at: status === 'occupied' ? t.dining_started_at || new Date().toISOString() : null,
            }
          : t
      ),
    }));

    try {
      const res = await fetch(`/api/tables`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, status }),
      });

      const data = await res.json();
      return res.ok && data.success;
    } catch {
      // Refresh on error
      get().fetchTables();
      return false;
    }
  },

  saveTable: async (tableData: Partial<DiningTable>) => {
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await get().fetchTables();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
