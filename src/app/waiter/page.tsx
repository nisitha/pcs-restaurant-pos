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
  Users,
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

  const fetchTablesAndOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const supabase = createClient();

      const { data: tablesData } = await supabase
        .from('dining_tables')
        .select('id, table_number, seating_capacity, status, current_order_id')
        .eq('branch_id', '00000000-0000-0000-0000-000000000001')
        .order('table_number', { ascending: true });

      const { data: ordersData } = await supabase
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

    const interval = setInterval(() => {
      fetchTablesAndOrders(true);
    }, 6000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchMenu, fetchTablesAndOrders]);

  const readyOrders = tables
    .filter((t) => t.current_order && t.current_order.kds_status === 'ready')
    .map((t) => ({
      table: t,
      order: t.current_order!,
    }));

  const filteredTables = tables.filter((t) => {
    if (filter === 'occupied') return t.status === 'occupied' || !!t.current_order;
    if (filter === 'ready') return t.current_order && t.current_order.kds_status === 'ready';
    if (filter === 'available') return t.status === 'available' && !t.current_order;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#F6F7F9] text-[#1A1D1F] h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#EBECEF] px-6 py-4 shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-bold border border-[#BDE8CB]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-[#1A1D1F] leading-tight">
                Waiter Service Panel
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[#7C828D]">
                  {currentUser?.display_name || 'Waiter Station'}
                </span>
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    connectionStatus === 'connected'
                      ? 'bg-[#D1F0DC] text-[#119C49] border-[#BDE8CB]'
                      : 'bg-[#FEF3E2] text-[#F59E0B] border-[#FDE3B8]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-[#119C49] animate-pulse' : 'bg-[#F59E0B]'
                    }`}
                  />
                  <span>{connectionStatus === 'connected' ? 'LIVE SYNC' : connectionStatus.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-[#F6F7F9] p-1 rounded-full border border-[#EBECEF]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                filter === 'all' ? 'bg-[#119C49] text-white shadow-sm' : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              All ({tables.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ready')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                filter === 'ready'
                  ? 'bg-[#119C49] text-white shadow-sm'
                  : readyOrders.length > 0
                  ? 'bg-[#D1F0DC] text-[#119C49]'
                  : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ready ({readyOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('occupied')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                filter === 'occupied' ? 'bg-[#119C49] text-white shadow-sm' : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              Occupied ({tables.filter((t) => t.status === 'occupied').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                filter === 'available' ? 'bg-[#119C49] text-white shadow-sm' : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              Available ({tables.filter((t) => t.status === 'available' && !t.current_order).length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-none">
        {/* Ready To Serve Alert Banner */}
        {readyOrders.length > 0 && (
          <div className="p-5 rounded-3xl bg-[#D1F0DC] border-2 border-[#BDE8CB] shadow-md animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#119C49] text-white flex items-center justify-center font-black animate-bounce shadow-md">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#119C49] uppercase tracking-wide">
                  Ready to Serve ({readyOrders.length} Order{readyOrders.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-[#1A1D1F]">
                  Kitchen stations marked the following orders ready. Deliver to guests promptly!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {readyOrders.map(({ table, order }) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white border border-[#BDE8CB] flex items-center justify-between gap-3 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#1A1D1F]">Table {table.table_number}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D1F0DC] text-[#119C49]">
                        {order.order_number}
                      </span>
                    </div>
                    <p className="text-xs text-[#7C828D] mt-0.5">{order.items_count} items &bull; {formatLKR(order.total_amount)}</p>
                  </div>

                  <Button
                    type="button"
                    disabled={servingOrderId === order.id}
                    onClick={() => handleMarkServed(order.id)}
                    className="h-10 px-4 bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-xl gap-1.5 shadow-md transition"
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
            const isServed = order?.kds_status === 'served';

            return (
              <div
                key={table.id}
                className={`rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 border bg-white shadow-sm ${
                  isReady
                    ? 'border-2 border-[#119C49] ring-4 ring-[#119C49]/10 shadow-md'
                    : hasOrder
                    ? 'border-[#EBECEF] hover:border-[#119C49]/40'
                    : 'border-[#EBECEF] bg-[#FCFCFD]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm ${
                          isReady
                            ? 'bg-[#119C49] text-white border-[#119C49]'
                            : hasOrder
                            ? 'bg-[#FEF3E2] text-[#F59E0B] border-[#FDE3B8]'
                            : 'bg-[#F4F5F7] text-[#7C828D] border-[#EBECEF]'
                        }`}
                      >
                        {table.table_number}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-[#1A1D1F]">Table {table.table_number}</span>
                        <span className="text-[11px] text-[#7C828D] flex items-center gap-1 font-medium">
                          <Users className="w-3 h-3" />
                          {table.seating_capacity} seats
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isReady
                          ? 'bg-[#D1F0DC] text-[#119C49] animate-pulse font-extrabold'
                          : hasOrder
                          ? 'bg-[#FEF3E2] text-[#F59E0B]'
                          : 'bg-[#F4F5F7] text-[#7C828D]'
                      }`}
                    >
                      {isReady ? 'READY TO SERVE' : hasOrder ? 'OCCUPIED' : 'AVAILABLE'}
                    </span>
                  </div>

                  {order ? (
                    <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#1A1D1F]">{order.order_number}</span>
                        <ElapsedTimer startTime={order.created_at} />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7C828D]">Prep Status:</span>
                        <span
                          className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                            isReady
                              ? 'bg-[#D1F0DC] text-[#119C49]'
                              : isPartiallyReady
                              ? 'bg-[#FEF3E2] text-[#F59E0B]'
                              : isPreparing
                              ? 'bg-blue-50 text-blue-600'
                              : isServed
                              ? 'bg-cyan-50 text-cyan-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {order.kds_status.replace('_', ' ')}
                        </span>
                      </div>

                      {order.station_progress.length > 0 && (
                        <div className="pt-2 border-t border-[#EBECEF]">
                          <div className="flex flex-wrap gap-1">
                            {order.station_progress.map((stn, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                  stn.status === 'ready' || stn.status === 'completed'
                                    ? 'bg-[#D1F0DC] text-[#119C49] border-[#BDE8CB]'
                                    : stn.status === 'in_preparation'
                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                    : 'bg-white text-[#7C828D] border-[#EBECEF]'
                                }`}
                              >
                                {stn.station_code}: {stn.status}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-[#7C828D]">{order.items_count} items</span>
                        <span className="font-mono font-bold text-[#119C49]">{formatLKR(order.total_amount)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-dashed border-[#EBECEF] text-center">
                      <p className="text-xs text-[#7C828D]">Table available for seating guests.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#F4F5F7] flex flex-col gap-2">
                  {order ? (
                    <>
                      {(isReady || isPartiallyReady || isPreparing) && (
                        <Button
                          type="button"
                          disabled={servingOrderId === order.id}
                          onClick={() => handleMarkServed(order.id)}
                          className={`w-full h-11 font-bold text-xs rounded-2xl gap-1.5 transition ${
                            isReady
                              ? 'bg-[#119C49] hover:bg-[#0E853E] text-white shadow-md shadow-[#119C49]/20'
                              : 'bg-white border border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F6F7F9]'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{servingOrderId === order.id ? 'Updating...' : 'Mark as Served'}</span>
                        </Button>
                      )}

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
                        className="w-full h-10 bg-[#D1F0DC] border-none text-[#119C49] hover:bg-[#C6ECD4] text-xs font-bold rounded-2xl gap-1.5 transition"
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
                      className="w-full h-11 bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-2xl gap-1.5 transition shadow-sm"
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
