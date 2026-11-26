'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { ActiveOrder, OrderType } from '@/types/pos.types';
import { formatLKR } from '@/lib/utils/currency';
import { formatRestaurantDateTime } from '@/lib/utils/datetime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Receipt,
  Utensils,
  ShoppingBag,
  Bike,
  Clock,
  ChefHat,
  Search,
  RefreshCw,
  Printer,
  PlusCircle,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function OrdersHistoryPage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();

  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orders) {
          setOrders(data.orders);
        }
      }
    } catch {
      // Error fetching orders
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesType = filterType === 'all' || o.order_type === filterType;
    const matchesPayment = filterPayment === 'all' || o.payment_status === filterPayment;
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.table_number && o.table_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesPayment && matchesSearch;
  });

  const unpaidCount = orders.filter((o) => o.payment_status === 'unpaid').length;
  const inPrepCount = orders.filter(
    (o) => o.kds_status === 'submitted' || o.kds_status === 'in_preparation'
  ).length;
  const readyCount = orders.filter((o) => o.kds_status === 'ready').length;

  const getOrderTypeBadge = (type: OrderType, tableNum?: string | null) => {
    switch (type) {
      case 'dine_in':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#D1F0DC] text-[#119C49] border border-[#BDE8CB]">
            <Utensils className="w-3 h-3" /> Dine-In {tableNum ? `(${tableNum})` : ''}
          </span>
        );
      case 'takeaway':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
            <ShoppingBag className="w-3 h-3" /> Takeaway
          </span>
        );
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200">
            <Bike className="w-3 h-3" /> Delivery
          </span>
        );
    }
  };

  const getKdsStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">Submitted</span>;
      case 'in_preparation':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">In Prep</span>;
      case 'ready':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D1F0DC] text-[#119C49] animate-pulse">Ready to Serve</span>;
      case 'served':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-600">Served</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EBECEF] pb-6 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-[#119C49]" /> Orders & Delivery History
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Real-time multi-station order tracking, table billing, and preparation statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={isLoading}
            className="bg-white border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F6F7F9] text-xs font-bold rounded-full gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => router.push('/pos')}
            className="bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-full gap-1.5 shadow-md shadow-[#119C49]/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New POS Order</span>
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-[#7C828D] font-medium">Unpaid Orders</p>
          <p className="text-2xl font-black text-[#F59E0B] font-mono mt-1">{unpaidCount}</p>
        </div>
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-[#7C828D] font-medium">Kitchen Cooking</p>
          <p className="text-2xl font-black text-blue-600 font-mono mt-1">{inPrepCount}</p>
        </div>
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-[#7C828D] font-medium">Ready to Serve</p>
          <p className="text-2xl font-black text-[#119C49] font-mono mt-1">{readyCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#EBECEF] rounded-3xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C828D]" />
          <Input
            placeholder="Search order number or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-full bg-[#F6F7F9] border-[#EBECEF] text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['all', 'dine_in', 'takeaway', 'delivery'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition capitalize ${
                filterType === type
                  ? 'bg-[#119C49] text-white shadow-sm'
                  : 'bg-[#F6F7F9] text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-[#EBECEF] shadow-sm">
            <Receipt className="w-10 h-10 text-[#7C828D]/50 mb-2" />
            <p className="text-sm font-bold text-[#1A1D1F]">No Orders Found</p>
            <p className="text-xs text-[#7C828D]">New orders placed at POS will show up here instantly.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-[#1A1D1F] font-mono">{order.order_number}</span>
                  {getOrderTypeBadge(order.order_type, order.table_number)}
                  {getKdsStatusBadge(order.kds_status)}
                </div>
                <p className="text-xs text-[#7C828D]">
                  {order.items_count} items &bull; Cashier: {order.cashier_name || 'Staff'} &bull; {formatRestaurantDateTime(order.created_at)}
                </p>
                {order.stations_routed && order.stations_routed.length > 0 && (
                  <p className="text-[11px] text-[#7C828D]">
                    Routed: <span className="font-semibold text-[#1A1D1F]">{order.stations_routed.join(', ')}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-right">
                  <p className="text-base font-extrabold text-[#119C49] font-mono">{formatLKR(order.total_amount)}</p>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      order.payment_status === 'paid'
                        ? 'bg-[#D1F0DC] text-[#119C49]'
                        : 'bg-[#FEF3E2] text-[#F59E0B]'
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
