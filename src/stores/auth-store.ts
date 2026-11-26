'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StaffUser, UserRole } from '@/types/auth.types';

interface AuthState {
  currentUser: StaffUser | null;
  isAuthenticated: boolean;
  login: (user: StaffUser) => void;
  logout: () => void;
  getRoleRedirectUrl: (role: UserRole) => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,

      login: (user: StaffUser) => {
        set({ currentUser: user, isAuthenticated: true });
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      getRoleRedirectUrl: (role: UserRole): string => {
        switch (role) {
          case 'cashier':
            return '/pos';
          case 'waiter':
            return '/waiter';
          case 'chef':
            return '/kds';
          case 'owner':
          case 'manager':
          case 'super_admin':
            return '/admin/dashboard';
          default:
            return '/pos';
        }
      },
    }),
    {
      name: 'pcs-pos-auth-session',
    }
  )
);
