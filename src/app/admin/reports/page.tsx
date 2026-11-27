'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Clock,
  ChefHat,
  Users,
  Percent,
  RefreshCw,
  Wallet,
  CreditCard,
  QrCode,
  Scale,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatLKR } from '@/lib/utils/currency';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export default function AdminReportsPage() {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async (selectedRange = range) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?range=${selectedRange}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(range);
  }, [range]);

  const financials = data?.financials || {
    gross_revenue: 0,
    discounts: 0,
    refunds: 0,
    net_sales: 0,
    cogs: 0,
    wastage: 0,
    gross_profit: 0,
    gross_profit_margin: 0,
    tender_breakdown: { cash: 0, credit_card: 0, qr_payment: 0 },
    paid_orders_count: 0,
    voided_orders_count: 0,
  };

  const staff = data?.staff || { cashiers: [], waiters: [] };
  const kitchen = data?.kitchen || { station_averages: [], total_tickets: 0, delayed_tickets_count: 0 };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Date Range Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBECEF] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-[#119C49]" /> Advanced BI & Financial Reports
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Real-time profit & loss, recipe ingredient COGS consumption, tender reconciliation, and staff/KDS benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Selector Pills */}
          <div className="bg-white p-1 rounded-2xl border border-[#EBECEF] flex items-center gap-1">
            {(['today', 'week', 'month', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition capitalize ${
                  range === r
                    ? 'bg-[#119C49] text-white shadow-sm'
                    : 'text-[#7C828D] hover:text-[#1A1D1F]'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'week' ? 'Last 7 Days' : r === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => fetchReports(range)}
            className="rounded-2xl border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] gap-1.5 h-10 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Top Financial P&L Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Sales */}
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Net Sales Revenue</span>
          <p className="text-2xl font-black text-[#119C49] font-mono">
            <AnimatedCounter value={Number(financials.net_sales || 0)} prefix="Rs. " decimals={2} />
          </p>
          <span className="text-[11px] text-[#7C828D] block mt-2">
            Gross: {formatLKR(financials.gross_revenue)} &bull; {financials.paid_orders_count} Paid Orders
          </span>
        </div>

        {/* COGS (Food Cost) */}
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Recipe Cost of Goods (COGS)</span>
          <p className="text-2xl font-black text-[#1A1D1F] font-mono">
            <AnimatedCounter value={Number(financials.cogs || 0)} prefix="Rs. " decimals={2} />
          </p>
          <span className="text-[11px] text-[#7C828D] block mt-2">
            Ingredient sales deductions
          </span>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Estimated Gross Profit</span>
          <p className="text-2xl font-black text-[#119C49] font-mono">
            <AnimatedCounter value={Number(financials.gross_profit || 0)} prefix="Rs. " decimals={2} />
          </p>
          <span className="text-[11px] text-[#119C49] font-bold block mt-2">
            {financials.gross_profit_margin}% Gross Margin
          </span>
        </div>

        {/* Discounts & Spoilage Wastage */}
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm">
          <span className="text-xs text-[#7C828D] font-medium block mb-1">Discounts & Wastage</span>
          <p className="text-2xl font-black text-red-600 font-mono">
            <AnimatedCounter value={Number((financials.discounts || 0) + (financials.wastage || 0))} prefix="Rs. " decimals={2} />
          </p>
          <span className="text-[11px] text-[#7C828D] block mt-2">
            Disc: {formatLKR(financials.discounts)} &bull; Waste: {formatLKR(financials.wastage)}
          </span>
        </div>
      </div>

      {/* Row 2: Payment Reconciliation & Theoretical vs Actual Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Reconciliation */}
        <div className="bg-white rounded-3xl border border-[#EBECEF] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#1A1D1F] text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#119C49]" /> Payment Tender Reconciliation
            </h2>
            <span className="text-xs font-bold text-[#7C828D]">
              Settled Transactions
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#119C49] border border-[#EBECEF] flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-[#1A1D1F] block">Cash Drawer</span>
                  <span className="text-[11px] text-[#7C828D]">Physical currency tendered</span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-[#1A1D1F]">
                {formatLKR(financials.tender_breakdown.cash)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-blue-600 border border-[#EBECEF] flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-[#1A1D1F] block">Credit / Debit Cards</span>
                  <span className="text-[11px] text-[#7C828D]">Bank terminal card payments</span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-[#1A1D1F]">
                {formatLKR(financials.tender_breakdown.credit_card)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#F59E0B] border border-[#EBECEF] flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-[#1A1D1F] block">LankaQR & Mobile Pay</span>
                  <span className="text-[11px] text-[#7C828D]">Direct dynamic QR code</span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-[#1A1D1F]">
                {formatLKR(financials.tender_breakdown.qr_payment)}
              </span>
            </div>
          </div>
        </div>

        {/* Theoretical vs. Actual Ingredient Consumption */}
        <div className="bg-white rounded-3xl border border-[#EBECEF] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#1A1D1F] text-base flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#119C49]" /> Theoretical vs. Actual Food Cost
            </h2>
            <span className="text-xs font-bold text-[#7C828D]">COGS Variance</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Theoretical Consumption (Recipe BOM):</span>
              <span className="font-black text-[#1A1D1F] font-mono">{formatLKR(financials.cogs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Kitchen Spoilage & Wastage Loss:</span>
              <span className="font-black text-red-600 font-mono">+{formatLKR(financials.wastage)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Void / Refund Reversals:</span>
              <span className="font-black text-[#119C49] font-mono">-{formatLKR(financials.refunds)}</span>
            </div>
            <div className="pt-2 border-t border-[#EBECEF] flex items-center justify-between">
              <span className="font-extrabold text-[#1A1D1F]">Actual Food Cost Impact:</span>
              <span className="text-sm font-black text-[#119C49] font-mono">
                {formatLKR(financials.cogs + financials.wastage)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#7C828D] leading-relaxed">
            The system tracks every ingredient gram and milliliter automatically via recipes. If actual variance exceeds 5% of net sales, review station wastage logs or check portion weight calibration.
          </p>
        </div>
      </div>

      {/* Row 3: Kitchen & Staff Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kitchen KDS Station Benchmarks */}
        <div className="bg-white rounded-3xl border border-[#EBECEF] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#1A1D1F] text-base flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#F59E0B]" /> Kitchen Station Speed (KDS)
            </h2>
            <span className="text-xs font-bold text-[#7C828D]">
              {kitchen.delayed_tickets_count} Delayed (&gt; 20m)
            </span>
          </div>

          <div className="space-y-2">
            {kitchen.station_averages.length === 0 ? (
              <p className="text-center text-xs text-[#7C828D] py-6">
                No completed kitchen tickets in this period.
              </p>
            ) : (
              kitchen.station_averages.map((st: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[#1A1D1F] block">{st.name}</span>
                    <span className="text-[10px] text-[#7C828D]">
                      {st.completed_tickets} tickets prepared
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black font-mono text-sm ${
                        st.avg_prep_time_minutes > 15
                          ? 'text-[#F59E0B]'
                          : st.avg_prep_time_minutes > 20
                          ? 'text-red-500'
                          : 'text-[#119C49]'
                      }`}
                    >
                      ~{st.avg_prep_time_minutes} mins
                    </span>
                    <span className="text-[10px] text-[#7C828D] block">Average prep speed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staff Sales Performance */}
        <div className="bg-white rounded-3xl border border-[#EBECEF] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#1A1D1F] text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#119C49]" /> Staff Sales Performance
            </h2>
            <span className="text-xs font-bold text-[#7C828D]">Cashiers & Waiters</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {staff.cashiers.length === 0 && staff.waiters.length === 0 ? (
              <p className="text-center text-xs text-[#7C828D] py-6">
                No orders recorded for staff in this period.
              </p>
            ) : (
              staff.cashiers.map((c: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[#1A1D1F] block">{c.name}</span>
                    <span className="text-[10px] text-[#7C828D]">
                      Role: Cashier &bull; {c.count} Orders Settled
                    </span>
                  </div>
                  <span className="font-black font-mono text-sm text-[#119C49]">
                    {formatLKR(c.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
