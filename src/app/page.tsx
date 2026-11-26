'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const router = useRouter();
  const { currentUser } = useAuthStore();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
    } else {
      switch (currentUser.role) {
        case 'waiter':
          router.replace('/waiter');
          break;
        case 'chef':
          router.replace('/kds');
          break;
        case 'owner':
        case 'manager':
        case 'super_admin':
          router.replace('/pos');
          break;
        case 'cashier':
        default:
          router.replace('/pos');
          break;
      }
    }
  }, [currentUser, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F6F7F9]">
      <div className="w-10 h-10 border-4 border-[#119C49] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
