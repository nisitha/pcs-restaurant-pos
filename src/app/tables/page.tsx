'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Layers,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/stores/table-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { TableStatus } from '@/types/table.types';
import { createClient } from '@/lib/supabase/client';

export default function TablesFloorPlanPage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { tables, fetchTables, updateTableStatus, isLoading } = useTableStore();
  const { setTable, setOrderType } = useCartStore();

  const [activeFloor, setActiveFloor] = useState<'first' | 'second' | 'third'>('first');
  const [selectedTableId, setSelectedTableId] = useState<string>('');

  // Booking Form State
  const [guestName, setGuestName] = useState<string>('Robert Fox');
  const [guestCount, setGuestCount] = useState<number>(4);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('08:30 PM');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Live Kitchen Orders Strip State
  const [liveOrders, setLiveOrders] = useState<Array<{
    id: string;
    order_number: string;
    table_number?: string | null;
    customer_name?: string | null;
    items_count: number;
    kds_status: string;
  }>>([]);

  const fetchLiveOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          kds_status,
          customers (name),
          dining_tables (table_number),
          order_items (id, quantity)
        `)
        .eq('branch_id', '00000000-0000-0000-0000-000000000001')
        .in('kds_status', ['submitted', 'in_preparation', 'partially_ready', 'ready'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setLiveOrders(
          data.map((o: any) => ({
            id: o.id,
            order_number: o.order_number,
            table_number: o.dining_tables?.table_number || null,
            customer_name: o.customers?.name || null,
            items_count: (o.order_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
            kds_status: o.kds_status,
          }))
        );
      }
    } catch (e) {
      console.warn('Error fetching live orders for floor strip:', e);
    }
  }, []);

  useEffect(() => {
    setBookingDate(new Date().toISOString().slice(0, 10));
    fetchTables();
    fetchLiveOrders();
  }, [fetchTables, fetchLiveOrders]);

  // Set default selected table once loaded
  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id);
    }
  }, [tables, selectedTableId]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  // Handle Book Table Action
  const handleBookTable = async () => {
    if (!selectedTable) return;
    try {
      // Toggle table status to reserved
      await updateTableStatus(selectedTable.id, 'reserved');
      setBookingSuccess(`Table ${selectedTable.table_number} booked for ${guestName} (${guestCount} Guests) at ${bookingTime}`);
      setTimeout(() => setBookingSuccess(null), 4000);
      fetchTables();
    } catch (e) {
      console.error('Booking table error:', e);
    }
  };

  // Handle Open POS Order for this table
  const handleOpenPosOrder = () => {
    if (!selectedTable) return;
    setOrderType('dine_in');
    setTable(selectedTable.id, selectedTable.table_number);
    router.push('/pos');
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F6F7F9]">
      {/* Center Floor Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header: Floor Switcher Pills */}
        <header className="p-4 pb-2 flex items-center justify-between gap-3 bg-[#F6F7F9] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFloor('first')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition shadow-sm ${
                activeFloor === 'first'
                  ? 'bg-[#D1F0DC] text-[#119C49]'
                  : 'bg-white text-[#7C828D] hover:text-[#1A1D1F] border border-[#EBECEF]'
              }`}
            >
              First Floor
            </button>
            <button
              type="button"
              onClick={() => setActiveFloor('second')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition shadow-sm ${
                activeFloor === 'second'
                  ? 'bg-[#D1F0DC] text-[#119C49]'
                  : 'bg-white text-[#7C828D] hover:text-[#1A1D1F] border border-[#EBECEF]'
              }`}
            >
              Second Floor
            </button>
            <button
              type="button"
              onClick={() => setActiveFloor('third')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition shadow-sm ${
                activeFloor === 'third'
                  ? 'bg-[#D1F0DC] text-[#119C49]'
                  : 'bg-white text-[#7C828D] hover:text-[#1A1D1F] border border-[#EBECEF]'
              }`}
            >
              Third Floor
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EBECEF] text-[#119C49]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#119C49]" /> Available
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EBECEF] text-[#F59E0B]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Occupied / Reserved
            </span>
          </div>
        </header>

        {/* Floor Map Layout Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-24 scrollbar-none">
          {bookingSuccess && (
            <div className="mb-4 p-3 rounded-2xl bg-[#D1F0DC] border border-[#BDE8CB] text-[#119C49] text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{bookingSuccess}</span>
            </div>
          )}

          {/* Grid of Tables surrounded by Dashed Silhouette */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tables.map((table, idx) => {
              const isSelected = selectedTable?.id === table.id;
              const isOccupiedOrReserved = table.status === 'occupied' || table.status === 'reserved';
              const isAvailable = table.status === 'available';

              // Dummy guest name and time for demo occupied tables matching mockup
              const demoGuests = [
                { name: 'Jacob Jones', time: '6:30 PM', guests: 4 },
                { name: 'Bessie Cooper', time: '6:30 PM', guests: 4 },
                { name: 'Ralph Edwards', time: '6:30 PM', guests: 4 },
                { name: 'Annette Black', time: '6:30 PM', guests: 6 },
              ];
              const guestInfo = demoGuests[idx % demoGuests.length];

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`border-2 border-dashed rounded-3xl p-3 transition-all duration-200 cursor-pointer relative ${
                    isSelected
                      ? 'border-[#119C49] ring-4 ring-[#119C49]/10'
                      : 'border-[#D5D8DF] hover:border-[#119C49]/50'
                  }`}
                >
                  {/* Inside Table Rectangle */}
                  <div
                    className={`rounded-2xl p-4 w-full min-h-[145px] flex flex-col justify-between shadow-sm transition-all ${
                      isOccupiedOrReserved
                        ? 'bg-[#FEF3E2] border border-[#FDE3B8]'
                        : 'bg-[#C6ECD4] border border-[#BDE8CB]'
                    }`}
                  >
                    {/* Top Row: Table Badge & Time */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                          isOccupiedOrReserved ? 'bg-[#F59E0B]' : 'bg-[#119C49]'
                        }`}
                      >
                        {table.table_number}
                      </div>

                      {isOccupiedOrReserved && (
                        <span className="text-[11px] font-bold text-[#1A1D1F] font-mono">
                          {guestInfo.time}
                        </span>
                      )}
                    </div>

                    {/* Middle: Guest details (if occupied) or pristine table */}
                    <div>
                      {isOccupiedOrReserved ? (
                        <div className="leading-tight">
                          <p className="text-xs font-bold text-[#1A1D1F] truncate">{guestInfo.name}</p>
                          <p className="text-[10px] text-[#7C828D] font-medium">{guestInfo.guests} Guests</p>
                        </div>
                      ) : (
                        <div className="leading-tight">
                          <p className="text-[10px] text-[#119C49] font-bold tracking-wide uppercase">Table Ready</p>
                          <p className="text-[11px] text-[#7C828D] font-medium">{table.seating_capacity || 4} Guests</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Pill */}
                    <div className="self-end">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                          isOccupiedOrReserved
                            ? 'bg-[#FDE3B8] text-[#F59E0B]'
                            : 'bg-[#A3E2BA] text-[#119C49]'
                        }`}
                      >
                        {isOccupiedOrReserved ? 'Reserved' : 'Available'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Pinned Live Kitchen Orders Strip */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#EBECEF] px-4 flex items-center gap-3 overflow-x-auto scrollbar-none shadow-lg z-20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C828D] whitespace-nowrap shrink-0">
            Live Kitchen:
          </span>

          {liveOrders.length === 0 ? (
            <span className="text-xs text-[#7C828D]">No active kitchen orders.</span>
          ) : (
            liveOrders.map((ord) => (
              <div
                key={ord.id}
                className="px-3.5 py-1.5 rounded-full bg-white border border-[#EBECEF] shadow-sm flex items-center gap-2.5 shrink-0"
              >
                <div className="w-7 h-7 rounded-full bg-[#F59E0B] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                  {ord.table_number || 'T1'}
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-[#1A1D1F] truncate max-w-[120px]">
                    {ord.customer_name || ord.order_number}
                  </p>
                  <p className="text-[10px] text-[#7C828D]">
                    {ord.items_count} items &rarr; Kitchen
                  </p>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    ord.kds_status === 'ready'
                      ? 'bg-[#D1F0DC] text-[#119C49]'
                      : 'bg-[#FEF3E2] text-[#F59E0B]'
                  }`}
                >
                  {ord.kds_status === 'ready' ? 'Ready' : 'Process'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Booking / Table Details Panel */}
      <aside className="w-[380px] bg-white border-l border-[#EBECEF] flex flex-col justify-between h-full shrink-0 shadow-lg z-20">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#F4F5F7] pb-4">
            <h2 className="text-lg font-extrabold text-[#1A1D1F] tracking-tight">Book Table</h2>
            <div className="text-base font-black text-[#119C49] font-mono">
              {selectedTable ? `T${selectedTable.table_number.replace(/\D/g, '') || selectedTable.table_number}` : 'T4'}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Guest Name */}
            <div>
              <label className="block text-[11px] font-bold text-[#7C828D] mb-1.5 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest full name..."
                className="w-full h-12 px-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] text-xs font-semibold text-[#1A1D1F] focus:outline-none focus:border-[#119C49] focus:ring-1 focus:ring-[#119C49]"
              />
            </div>

            {/* Number of Guest Stepper */}
            <div>
              <label className="block text-[11px] font-bold text-[#7C828D] mb-1.5 uppercase tracking-wide">
                Number of Guest
              </label>
              <div className="flex items-center justify-between h-12 px-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF]">
                <button
                  type="button"
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-7 h-7 rounded-full bg-[#119C49] text-white flex items-center justify-center font-bold hover:bg-[#0E853E] transition shadow-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-extrabold text-[#1A1D1F] font-mono">
                  {guestCount}
                </span>
                <button
                  type="button"
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="w-7 h-7 rounded-full bg-[#119C49] text-white flex items-center justify-center font-bold hover:bg-[#0E853E] transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-[11px] font-bold text-[#7C828D] mb-1.5 uppercase tracking-wide">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] text-xs font-semibold text-[#1A1D1F] focus:outline-none focus:border-[#119C49] focus:ring-1 focus:ring-[#119C49]"
                />
              </div>
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-[11px] font-bold text-[#7C828D] mb-1.5 uppercase tracking-wide">
                Time
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  placeholder="e.g. 08:30 PM"
                  className="w-full h-12 px-4 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] text-xs font-semibold text-[#1A1D1F] focus:outline-none focus:border-[#119C49] focus:ring-1 focus:ring-[#119C49]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-[#F4F5F7] space-y-2.5 bg-[#FCFCFD]">
          <Button
            type="button"
            onClick={handleBookTable}
            className="w-full h-14 bg-[#119C49] hover:bg-[#0E853E] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-[#119C49]/25 transition"
          >
            Book Table
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleOpenPosOrder}
            className="w-full h-12 bg-[#D1F0DC] hover:bg-[#C6ECD4] text-[#119C49] font-bold text-xs rounded-2xl border-none transition"
          >
            Open POS Order for Table {selectedTable?.table_number || ''}
          </Button>
        </div>
      </aside>
    </div>
  );
}
