'use client';

import React from 'react';
import { ChefHat, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function KdsPage() {
  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col justify-center items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
        <ChefHat className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Kitchen Display System (KDS)</h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        Multi-station ticket routing (`HOT`, `GRILL`, `BEV`, `DESSERT`), real-time preparation timers, and audible alerts are scheduled for Milestone 1.7.
      </p>
      <div className="flex gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
          Station Routing Active
        </span>
      </div>
    </div>
  );
}
