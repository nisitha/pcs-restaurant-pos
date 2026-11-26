'use client';

import React from 'react';
import { LayoutDashboard, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <LayoutDashboard className="w-7 h-7 text-purple-400" /> Owner & Manager Dashboard
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time restaurant operational metrics, cash shift audits, and business intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Today's Sales</span>
          <p className="text-2xl font-bold text-white">Rs. 0.00</p>
          <span className="text-[11px] text-zinc-500 block mt-1">Currency: LKR</span>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Active Cash Shifts</span>
          <p className="text-2xl font-bold text-emerald-400">1</p>
          <span className="text-[11px] text-zinc-500 block mt-1">Main Counter Terminal</span>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Dining Tables</span>
          <p className="text-2xl font-bold text-white">8 Tables</p>
          <span className="text-[11px] text-zinc-500 block mt-1">Main Dining Hall</span>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Kitchen Stations</span>
          <p className="text-2xl font-bold text-amber-400">4 Active</p>
          <span className="text-[11px] text-zinc-500 block mt-1">HOT, GRILL, BEV, DESSERT</span>
        </div>
      </div>
    </div>
  );
}
