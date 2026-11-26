'use client';

import React from 'react';
import { Smartphone, Utensils, Bell } from 'lucide-react';

export default function WaiterPage() {
  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col justify-center items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
        <Smartphone className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Waiter Mobile & Tablet Panel</h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        Interactive table layout (Tables T1 to T8), quick dining order entry, and kitchen ready alerts are scheduled for Milestone 1.4 & 1.8.
      </p>
      <div className="flex gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
          Tables T1 to T8 Configured
        </span>
      </div>
    </div>
  );
}
