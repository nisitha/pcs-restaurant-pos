'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuCategory, MenuItem, KitchenStation, ModifierGroup } from '@/types/menu.types';

interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
  stations: KitchenStation[];
  modifierGroups: ModifierGroup[];
  cachedVersion: number;
  lastFetchedAt: string | null;
  isLoading: boolean;
  error: string | null;

  fetchMenu: (forceRefresh?: boolean) => Promise<void>;
  toggleAvailability: (itemId: string, currentStatus: boolean) => Promise<boolean>;
  updateCachedItem: (updatedItem: MenuItem) => void;
  invalidateCache: () => void;
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      categories: [],
      items: [],
      stations: [],
      modifierGroups: [],
      cachedVersion: 0,
      lastFetchedAt: null,
      isLoading: false,
      error: null,

      fetchMenu: async (forceRefresh = false) => {
        try {
          set({ isLoading: true, error: null });

          // 1. Check current menu version from server
          const hasMissingImages = get().items.some((i) => !i.image_url);
          if (!forceRefresh && !hasMissingImages && get().cachedVersion > 0 && get().items.length > 0) {
            const versionRes = await fetch('/api/menu/version');
            if (versionRes.ok) {
              const versionData = await versionRes.json();
              if (versionData.version === get().cachedVersion) {
                // Version matches: client cache is completely fresh! Zero DB query needed.
                set({ isLoading: false });
                return;
              }
            }
          }

          // 2. Fetch fresh snapshot if outdated or forced
          const res = await fetch('/api/menu');
          if (!res.ok) throw new Error('Failed to fetch menu');

          const data = await res.json();
          if (data.success) {
            set({
              categories: data.categories || [],
              items: data.items || [],
              stations: data.stations || [],
              modifierGroups: data.modifierGroups || [],
              cachedVersion: data.version || 1,
              lastFetchedAt: new Date().toISOString(),
              isLoading: false,
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error fetching menu';
          set({ error: msg, isLoading: false });
        }
      },

      toggleAvailability: async (itemId: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;

        // 1. Optimistic update
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, is_available: nextStatus } : item
          ),
        }));

        try {
          const res = await fetch(`/api/menu/items/${itemId}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAvailable: nextStatus }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            // Revert on failure
            set((state) => ({
              items: state.items.map((item) =>
                item.id === itemId ? { ...item, is_available: currentStatus } : item
              ),
            }));
            return false;
          }

          if (data.newVersion) {
            set({ cachedVersion: data.newVersion });
          }
          return true;
        } catch {
          // Revert on error
          set((state) => ({
            items: state.items.map((item) =>
              item.id === itemId ? { ...item, is_available: currentStatus } : item
            ),
          }));
          return false;
        }
      },

      updateCachedItem: (updatedItem: MenuItem) => {
        set((state) => {
          const exists = state.items.some((i) => i.id === updatedItem.id);
          const newItems = exists
            ? state.items.map((i) => (i.id === updatedItem.id ? updatedItem : i))
            : [updatedItem, ...state.items];
          return { items: newItems };
        });
      },

      invalidateCache: () => {
        set({ cachedVersion: 0, lastFetchedAt: null });
      },
    }),
    {
      name: 'pcs-pos-cached-menu',
    }
  )
);
