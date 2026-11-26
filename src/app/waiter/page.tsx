'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone,
  Utensils,
  Bell,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Flame,
  Coffee,
  IceCream,
  Users,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useMenuStore } from '@/stores/menu-store';
import { createClient } from '@/lib/supabase/client';
import { audioAlert } from '@/lib/audio/chime';
import { formatLKR } from '@/lib/utils/currency';
import { AmendOrderModal } from '@/components/waiter/amend-order-modal';
import { NewTableOrderModal } from '@/components/waiter/new-table-order-modal';
import { ElapsedTimer } from '@/components/kds/elapsed-timer';

interface WaiterTableOrder {
  id: string;
  order_number: string;
  order_type: string;
  kds_status: string;
  payment_status: string;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  items_count: number;
  station_progress: Array<{
    station_code: string;
    station_name: string;
    status: string;
  }>;
}

interface WaiterTable {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  current_order?: WaiterTableOrder | null;
}

export default function WaiterPage() {
  const { currentUser } = useAuthStore();
  const { fetchMenu } = useMenuStore();

  const [tables, setTables] = useState<WaiterTable[]>([]);
  const [filter, setFilter] = useState<'all' | 'occupied' | 'ready' | 'available'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [servingOrderId, setServingOrderId] = useState<string | null>(null);

  // Modals state
  const [amendModal, setAmendModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
    tableNumber: string;
  }>({
    isOpen: false,
    orderId: '',
    orderNumber: '',
    tableNumber: '',
  });

  const [newOrderModal, setNewOrderModal] = useState<{
    isOpen: boolean;
    tableId: string;
    tableNumber: string;
  }>({
    isOpen: false,
    tableId: '',
    tableNumber: '',
  });

  const previousReadyOrdersRef = useRef<Set<string>>(new Set());

  // Fetch tables and their active orders
  const fetchTablesAndOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const supabase = createClient();

      // 1. Fetch tables
      const { data: tablesData, error: tablesErr } = await supabase
        .from('dining_tables')
        .select('id, table_number, seating_capacity, status, current_order_id')
        .eq('branch_id', '00000000-0000-0000-0000-000000000001')
        .order('table_number', { ascending: true });

      if (tablesErr) {
        console.warn('Error fetching tables:', tablesErr.message);
        return;
      }

      // 2. Fetch active orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          table_id,
          kds_status,
          payment_status,
          total_amount,
          notes,
          created_at,
          order_items (id, quantity),
          station_routing_tickets (
            id,
            status,
            kitchen_stations (code, name)
          )
        `)
        .eq('branch_id', '00000000-0000-0000-0000-000000000001')
        .in('payment_status', ['unpaid', 'partially_paid'])
        .order('created_at', { ascending: false });

      const activeOrdersMap = new Map<string, WaiterTableOrder>();

      (ordersData || []).forEach((o: any) => {
        if (!o.table_id) return;

        const stationProgress = (o.station_routing_tickets || []).map((t: any) => ({
          station_code: t.kitchen_stations?.code || 'KT',
          station_name: t.kitchen_stations?.name || 'Kitchen',
          status: t.status,
        }));

        const itemsCount = (o.order_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

        // Map by table ID
        if (!activeOrdersMap.has(o.table_id)) {
          activeOrdersMap.set(o.table_id, {
            id: o.id,
            order_number: o.order_number,
            order_type: o.order_type,
            kds_status: o.kds_status,
            payment_status: o.payment_status,
            total_amount: Number(o.total_amount || 0),
            notes: o.notes,
            created_at: o.created_at,
            items_count: itemsCount,
            station_progress: stationProgress,
          });
        }
      });

      // Check for newly ready orders to trigger audible chime
      const currentReadyOrders = new Set<string>();
      activeOrdersMap.forEach((ord) => {
        if (ord.kds_status === 'ready') {
          currentReadyOrders.add(ord.id);
          if (!previousReadyOrdersRef.current.has(ord.id)) {
            audioAlert.playReadyAlert();
          }
        }
      });
      previousReadyOrdersRef.current = currentReadyOrders;

      // Merge into tables list
      const merged: WaiterTable[] = (tablesData || []).map((tbl: any) => {
        const currentOrder = activeOrdersMap.get(tbl.id) || null;
        return {
          id: tbl.id,
          table_number: tbl.table_number,
          seating_capacity: tbl.seating_capacity || 4,
          status: currentOrder ? 'occupied' : tbl.status,
          current_order: currentOrder,
        };
      });

      setTables(merged);
    } catch (e) {
      console.error('Waiter panel fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle Mark as Served
  const handleMarkServed = async (orderId: string) => {
    try {
      setServingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}/serve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waiterId: currentUser?.id,
          notes: 'Served by waiter via mobile tablet',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTablesAndOrders(true);
      }
    } catch (e) {
      console.error('Error serving order:', e);
    } finally {
      setServingOrderId(null);
    }
  };

  // Realtime subscription
  useEffect(() => {
    fetchMenu();
    fetchTablesAndOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('waiter-floor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchTablesAndOrders(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_routing_tickets' }, () => {
        fetchTablesAndOrders(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables' }, () => {
        fetchTablesAndOrders(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('connecting');
        }
      });

    // Fallback polling every 6 seconds
    const interval = setInterval(() => {
      fetchTablesAndOrders(true);
    }, 6000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchMenu, fetchTablesAndOrders]);

  // Ready orders list across all tables
  const readyOrders = tables
    .filter((t) => t.current_order && t.current_order.kds_status === 'ready')
    .map((t) => ({
      table: t,
      order: t.current_order!,
    }));

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    if (filter === 'occupied') return t.status === 'occupied' || !!t.current_order;
    if (filter === 'ready') return t.current_order && t.current_order.kds_status === 'ready';
    if (filter === 'available') return t.status === 'available' && !t.current_order;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <header className="sticky top-16 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Waiter Service Panel
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-zinc-400">
                  Floor Dining &bull; {currentUser?.display_name || 'Waiter Station'}
                </span>
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-mono font-semibold border ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>{connectionStatus === 'connected' ? 'LIVE SYNC' : connectionStatus.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({tables.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ready')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'ready'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : readyOrders.length > 0
                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ready ({readyOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('occupied')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'occupied' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Occupied ({tables.filter((t) => t.status === 'occupied').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'available' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Available ({tables.filter((t) => t.status === 'available' && !t.current_order).length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6">
        {/* Ready To Serve Alert Banner */}
        {readyOrders.length > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 shadow-xl shadow-emerald-950/20 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center font-black animate-bounce">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wide">
                  Ready to Serve ({readyOrders.length} Order{readyOrders.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-zinc-300">
                  Kitchen stations have marked the following table orders as fully prepared. Pick up and serve to guests!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {readyOrders.map(({ table, order }) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl bg-zinc-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">Table {table.table_number}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {order.order_number}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{order.items_count} items &bull; {formatLKR(order.total_amount)}</p>
                  </div>

                  <Button
                    type="button"
                    disabled={servingOrderId === order.id}
                    onClick={() => handleMarkServed(order.id)}
                    className="h-10 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl gap-1.5 shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{servingOrderId === order.id ? 'Serving...' : 'Mark Served'}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tables Floor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const hasOrder = !!table.current_order;
            const order = table.current_order;
            const isReady = order?.kds_status === 'ready';
            const isPartiallyReady = order?.kds_status === 'partially_ready';
            const isPreparing = order?.kds_status === 'in_preparation';
            const isSubmitted = order?.kds_status === 'submitted';
            const isServed = order?.kds_status === 'served';

            return (
              <div
                key={table.id}
                className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 border bg-zinc-900 shadow-md ${
                  isReady
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-950/20'
                    : hasOrder
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-800/80 hover:border-emerald-500/30 bg-zinc-900/60'
                }`}
              >
                {/* Table Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border ${
                          isReady
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                            : hasOrder
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {table.table_number}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white">Table {table.table_number}</span>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {table.seating_capacity} seats
                        </span>
                      </div>
                    </div>

                    {/* Table Status Pill */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isReady
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse font-extrabold'
                          : hasOrder
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {isReady ? 'READY TO SERVE' : hasOrder ? 'OCCUPIED' : 'AVAILABLE'}
                    </span>
                  </div>

                  {/* Order Details (if occupied) */}
                  {order ? (
                    <div className="mt-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-zinc-200">{order.order_number}</span>
                        <ElapsedTimer startTime={order.created_at} />
                      </div>

                      {/* Preparation Status Pill */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Prep Status:</span>
                        <span
                          className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded-md ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                              : isPartiallyReady
                              ? 'bg-orange-500/20 text-orange-400 font-bold'
                              : isPreparing
                              ? 'bg-blue-500/20 text-blue-400'
                              : isServed
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {order.kds_status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Station Progress */}
                      {order.station_progress.length > 0 && (
                        <div className="pt-2 border-t border-zinc-800/60">
                          <p className="text-[10px] text-zinc-500 uppercase font-mono font-bold mb-1">
                            Station Routing:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {order.station_progress.map((stn, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                  stn.status === 'ready' || stn.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : stn.status === 'in_preparation'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {stn.station_code}: {stn.status}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{order.items_count} items</span>
                        <span className="font-mono font-bold text-white">{formatLKR(order.total_amount)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800/80 text-center">
                      <p className="text-xs text-zinc-500">Table ready for walk-in or reservation.</p>
                    </div>
                  )}
                </div>

                {/* Table Action Buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
                  {order ? (
                    <>
                      {/* If Ready or In Prep, allow marking Served */}
                      {(isReady || isPartiallyReady || isPreparing) && (
                        <Button
                          type="button"
                          disabled={servingOrderId === order.id}
                          onClick={() => handleMarkServed(order.id)}
                          className={`w-full h-10 font-bold text-xs rounded-xl gap-1.5 transition shadow-sm ${
                            isReady
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{servingOrderId === order.id ? 'Updating...' : 'Mark as Served'}</span>
                        </Button>
                      )}

                      {/* Add Extra Items / Amend Order */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setAmendModal({
                            isOpen: true,
                            orderId: order.id,
                            orderNumber: order.order_number,
                            tableNumber: table.table_number,
                          })
                        }
                        className="w-full h-9 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 text-xs font-semibold gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Items (Amend)</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() =>
                        setNewOrderModal({
                          isOpen: true,
                          tableId: table.id,
                          tableNumber: table.table_number,
                        })
                      }
                      className="w-full h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Open Table Order</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modals */}
      <AmendOrderModal
        isOpen={amendModal.isOpen}
        onClose={() => setAmendModal((prev) => ({ ...prev, isOpen: false }))}
        orderId={amendModal.orderId}
        orderNumber={amendModal.orderNumber}
        tableNumber={amendModal.tableNumber}
        waiterId={currentUser?.id}
        onSuccess={() => fetchTablesAndOrders(true)}
      />

      <NewTableOrderModal
        isOpen={newOrderModal.isOpen}
        onClose={() => setNewOrderModal((prev) => ({ ...prev, isOpen: false }))}
        tableId={newOrderModal.tableId}
        tableNumber={newOrderModal.tableNumber}
        waiterId={currentUser?.id}
        onSuccess={() => fetchTablesAndOrders(true)}
      />
    </div>
  );
}
