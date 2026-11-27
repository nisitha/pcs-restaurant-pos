'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Scale,
  Boxes,
  Truck,
  Users,
  Tag,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatLKR } from '@/lib/utils/currency';
import { Ingredient } from '@/types/inventory.types';

export default function AdminDashboardPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.success) {
        setIngredients(data.ingredients || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const lowStockItems = ingredients.filter((i) => i.current_stock <= i.min_stock_level);
  const totalValuation = ingredients.reduce((sum, i) => sum + i.unit_cost * i.current_stock, 0);

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto scrollbar-none space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBECEF] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-[#119C49]" /> Analytics & Reports
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Real-time restaurant operational metrics, cash shift audits, recipe food costs, and inventory alerts.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchDashboardData}
          className="rounded-2xl border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] gap-1.5 h-10 px-3.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold">Refresh</span>
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Today&apos;s Gross Sales</span>
          <p className="text-2xl font-black text-[#119C49] font-mono">Rs. 18,450.00</p>
          <span className="text-[11px] text-[#119C49] font-bold flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> +14.8% vs yesterday
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Total Stock Valuation</span>
          <p className="text-2xl font-black text-[#1A1D1F] font-mono">{formatLKR(totalValuation)}</p>
          <span className="text-[11px] text-[#7C828D] block mt-2">
            {ingredients.length} Tracked Ingredients
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Low Stock Alerts</span>
          <p
            className={`text-2xl font-black ${
              lowStockItems.length > 0 ? 'text-red-600' : 'text-[#119C49]'
            }`}
          >
            {lowStockItems.length} Items
          </p>
          <span className="text-[11px] text-[#7C828D] block mt-2">
            Below threshold level
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Manager Void & Refunds</span>
          <p className="text-2xl font-black text-[#1A1D1F] font-mono">Protected</p>
          <span className="text-[11px] text-[#119C49] font-bold flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" /> PIN Authorized (2222/1111)
          </span>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      <div className="bg-white rounded-3xl border border-[#EBECEF] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#1A1D1F]">
                Low Stock & Depletion Warnings
              </h2>
              <p className="text-xs text-[#7C828D]">
                Ingredients approaching or below minimum buffer quantities.
              </p>
            </div>
          </div>

          <Link href="/admin/inventory">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#EBECEF] text-xs font-bold text-[#119C49]"
            >
              Open Inventory &rarr;
            </Button>
          </Link>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#7C828D] bg-[#F6F7F9] rounded-2xl border border-[#EBECEF]">
            All ingredients are currently well above safety stock thresholds.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-red-50/60 border border-red-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-sm text-[#1A1D1F] block">
                    {item.name}
                  </span>
                  <span className="text-xs text-red-600 font-mono font-bold">
                    Stock: {item.current_stock} {item.unit} (Min: {item.min_stock_level} {item.unit})
                  </span>
                </div>
                <Link href="/admin/purchasing">
                  <Button
                    size="sm"
                    className="h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold"
                  >
                    Reorder
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Phase 2 Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/recipes"
          className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Scale className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1D1F] text-base mb-1 flex items-center justify-between">
            <span>Recipe (BOM) & Food Cost</span>
            <ArrowUpRight className="w-4 h-4 text-[#7C828D] group-hover:text-[#119C49] transition" />
          </h3>
          <p className="text-xs text-[#7C828D]">
            Manage ingredient formulas per dish and monitor expected gross margin % against selling prices.
          </p>
        </Link>

        <Link
          href="/admin/inventory"
          className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#F59E0B] flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Boxes className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1D1F] text-base mb-1 flex items-center justify-between">
            <span>Inventory, Stock Counts & Wastage</span>
            <ArrowUpRight className="w-4 h-4 text-[#7C828D] group-hover:text-[#F59E0B] transition" />
          </h3>
          <p className="text-xs text-[#7C828D]">
            Perform physical variance counts, view immutable stock movement ledgers, and log kitchen wastage.
          </p>
        </Link>

        <Link
          href="/admin/purchasing"
          className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1D1F] text-base mb-1 flex items-center justify-between">
            <span>Suppliers & Purchase / GRN</span>
            <ArrowUpRight className="w-4 h-4 text-[#7C828D] group-hover:text-[#119C49] transition" />
          </h3>
          <p className="text-xs text-[#7C828D]">
            Manage supplier catalogs, create purchase orders, and receive goods to auto-increment stock levels.
          </p>
        </Link>

        <Link
          href="/admin/customers"
          className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1D1F] text-base mb-1 flex items-center justify-between">
            <span>Customer CRM & Loyalty</span>
            <ArrowUpRight className="w-4 h-4 text-[#7C828D] group-hover:text-[#119C49] transition" />
          </h3>
          <p className="text-xs text-[#7C828D]">
            Guest profiles, VIP/Corporate tiers, and automated 1 pt / Rs. 100 loyalty point balances.
          </p>
        </Link>

        <Link
          href="/admin/promotions"
          className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#F59E0B] flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1D1F] text-base mb-1 flex items-center justify-between">
            <span>Promotions & Happy Hour</span>
            <ArrowUpRight className="w-4 h-4 text-[#7C828D] group-hover:text-[#F59E0B] transition" />
          </h3>
          <p className="text-xs text-[#7C828D]">
            Configure scheduled time-based Happy-Hour rules, promo codes, and combo meal bundles.
          </p>
        </Link>

        <Link
          href="/admin/reports"
          className="p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm hover:shadow-md transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#1A1D1F] text-base mb-1 flex items-center justify-between">
            <span>Advanced BI & Reports</span>
            <ArrowUpRight className="w-4 h-4 text-[#7C828D] group-hover:text-[#119C49] transition" />
          </h3>
          <p className="text-xs text-[#7C828D]">
            Comprehensive financial P&L, recipe COGS vs actual wastage, tender audits, and staff/KDS metrics.
          </p>
        </Link>
      </div>
    </div>
  );
}
