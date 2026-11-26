'use client';

import React from 'react';
import { LayoutDashboard, TrendingUp, Users, DollarSign, ArrowUpRight } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto scrollbar-none">
      <div className="border-b border-[#EBECEF] pb-6 mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
          <LayoutDashboard className="w-7 h-7 text-[#119C49]" /> Analytics & Reports
        </h1>
        <p className="text-xs text-[#7C828D] mt-1">
          Real-time restaurant operational metrics, cash shift audits, and business intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Today&apos;s Gross Sales</span>
          <p className="text-2xl font-black text-[#119C49] font-mono">Rs. 18,450.00</p>
          <span className="text-[11px] text-[#119C49] font-bold flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> +14.8% vs yesterday
          </span>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Active Cash Shifts</span>
          <p className="text-2xl font-black text-[#1A1D1F] font-mono">1 Active</p>
          <span className="text-[11px] text-[#7C828D] block mt-2">Main Counter Terminal</span>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Dining Floor Capacity</span>
          <p className="text-2xl font-black text-[#1A1D1F] font-mono">8 Tables</p>
          <span className="text-[11px] text-[#119C49] font-bold block mt-2">Main Dining Hall</span>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Kitchen Stations</span>
          <p className="text-2xl font-black text-[#F59E0B] font-mono">4 Active</p>
          <span className="text-[11px] text-[#7C828D] block mt-2">HOT, GRILL, BEV, DESSERT</span>
        </div>
      </div>
    </div>
  );
}
