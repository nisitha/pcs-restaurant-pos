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
    const interval = setInterval(fetchOrders, 15000); // Poll every 15s for live KDS updates
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Utensils className="w-3 h-3" /> Dine-In {tableNum ? `(${tableNum})` : ''}
          </span>
        );
      case 'takeaway':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShoppingBag className="w-3 h-3" /> Takeaway
          </span>
        );
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Bike className="w-3 h-3" /> Delivery
          </span>
        );
    }
  };

  const getKdsStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Submitted to Kitchen</Badge>;
      case 'in_preparation':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">In Preparation</Badge>;
      case 'ready':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ready to Serve</Badge>;
      case 'served':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Served</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-amber-500" /> Active Orders & History
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time multi-station order tracking, table billing, and preparation statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={isLoading}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => router.push('/pos')}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New POS Order</span>
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Total Orders Today</span>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">In Kitchen Preparation</span>
          <p className="text-2xl font-bold text-amber-400">{inPrepCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Ready to Serve / Dispatch</span>
          <p className="text-2xl font-bold text-emerald-400">{readyCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Unpaid Bills</span>
          <p className="text-2xl font-bold text-rose-400">{unpaidCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterType('all');
              setFilterPayment('all');
            }}
            className={`text-xs rounded-xl ${
              filterType === 'all' && filterPayment === 'all'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            All Orders ({orders.length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterType('dine_in');
              setFilterPayment('all');
            }}
            className={`text-xs rounded-xl ${
              filterType === 'dine_in'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Dine-In
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterType('takeaway');
              setFilterPayment('all');
            }}
            className={`text-xs rounded-xl ${
              filterType === 'takeaway'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Takeaway
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterType('delivery');
              setFilterPayment('all');
            }}
            className={`text-xs rounded-xl ${
              filterType === 'delivery'
                ? 'bg-orange-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Delivery
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilterPayment(filterPayment === 'unpaid' ? 'all' : 'unpaid')}
            className={`text-xs rounded-xl ${
              filterPayment === 'unpaid'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Unpaid Only ({unpaidCount})
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order # or table..."
            className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-zinc-400">No orders match the filter.</p>
            <Button
              size="sm"
              onClick={() => router.push('/pos')}
              className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Open POS & Create Order
            </Button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-base text-amber-400">
                    {order.order_number}
                  </span>
                  {getOrderTypeBadge(order.order_type, order.table_number)}
                  {getKdsStatusBadge(order.kds_status)}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      order.payment_status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>

                <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {formatRestaurantDateTime(order.created_at, 'time')}
                  </span>
                  {order.customer_name && (
                    <span>Customer: <strong className="text-white">{order.customer_name}</strong></span>
                  )}
                  <span>Cashier: <strong className="text-zinc-300">{order.cashier_name}</strong></span>
                </div>

                {/* Stations Routed Breakdown */}
                <div className="flex items-center gap-1.5 pt-1">
                  <ChefHat className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-[11px] text-zinc-400">Routed Stations:</span>
                  <div className="flex flex-wrap gap-1">
                    {(order.stations_routed || ['Hot Kitchen']).map((st, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-zinc-800 text-orange-300 border border-zinc-700 px-1.5 py-0.2 rounded font-semibold"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Actions */}
              <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Total Due</span>
                  <span className="text-xl font-black text-white font-mono">
                    {formatLKR(order.total_amount)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 px-2.5 bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white text-xs gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">KOT</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      router.push('/pos');
                    }}
                    className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1"
                  >
                    <span>Amend / Pay</span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
