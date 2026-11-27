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
  QrCode,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/stores/table-store';
import { useCartStore } from '@/stores/cart-store';
import { useBranchStore } from '@/stores/branch-store';
import { createClient } from '@/lib/supabase/client';
import { QrTentCardsModal } from '@/components/tables/qr-tent-cards-modal';

export default function TablesFloorPlanPage() {
  const router = useRouter();
  const { tables, fetchTables, updateTableStatus } = useTableStore();
  const { setTable, setOrderType } = useCartStore();
  const { activeBranchId } = useBranchStore();

  const [activeFloor, setActiveFloor] = useState<'first' | 'second' | 'third'>('first');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);

  // Booking Form State
  const [guestName, setGuestName] = useState<string>('Robert Fox');
  const [guestCount, setGuestCount] = useState<number>(4);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('08:30 PM');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Live Kitchen Orders Strip State
  const [liveOrders, setLiveOrders] = useState<
    Array<{
      id: string;
      order_number: string;
      table_number?: string | null;
      customer_name?: string | null;
      items_count: number;
      kds_status: string;
      created_at?: string;
    }>
  >([]);

  const fetchLiveOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          kds_status,
          created_at,
          customers (name),
          dining_tables (table_number),
          order_items (id, quantity)
        `)
        .eq('branch_id', activeBranchId || '00000000-0000-0000-0000-000000000001')
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
            created_at: o.created_at,
          }))
        );
      }
    } catch (e) {
      console.warn('Error fetching live orders for floor strip:', e);
    }
  }, [activeBranchId]);

  useEffect(() => {
    setBookingDate(new Date().toISOString().slice(0, 10));
    fetchTables();
    fetchLiveOrders();
  }, [fetchTables, fetchLiveOrders]);

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id);
    }
  }, [tables, selectedTableId]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  const handleBookTable = async () => {
    if (!selectedTable) return;
    try {
      await updateTableStatus(selectedTable.id, 'reserved');
      setBookingSuccess(
        `Table ${selectedTable.table_number} booked for ${guestName} (${guestCount} Guests) at ${bookingTime}`
      );
      setIsMobileSheetOpen(false);
      setTimeout(() => setBookingSuccess(null), 4000);
      fetchTables();
    } catch (e) {
      console.error('Booking table error:', e);
    }
  };

  const handleOpenPosOrder = () => {
    if (!selectedTable) return;
    setOrderType('dine_in');
    setTable(selectedTable.id, selectedTable.table_number);
    router.push('/pos');
  };

  // Visual elapsed timer helper for occupied/reserved tables
  const getTableTimerLabel = (tableNumber: string, updatedAt?: string, idx = 0) => {
    const activeOrd = liveOrders.find((o) => o.table_number === tableNumber);
    if (activeOrd?.created_at) {
      const mins = Math.max(1, Math.floor((Date.now() - new Date(activeOrd.created_at).getTime()) / 60000));
      return `${mins}m`;
    }
    if (updatedAt) {
      const mins = Math.max(1, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000));
      if (mins < 240) return `${mins}m`;
    }
    const fallbackMins = [14, 28, 9, 36];
    return `${fallbackMins[idx % fallbackMins.length]}m`;
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#f4fbf7] relative">
      {/* Center Floor Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header: Floor Switcher Pills & Status Legend */}
        <header className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5 bg-white border-b border-[#E5ECE8] shrink-0 shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(['first', 'second', 'third'] as const).map((floor) => {
              const isActive = activeFloor === floor;
              const label = floor === 'first' ? 'First Floor' : floor === 'second' ? 'Second Floor' : 'Third Floor';
              return (
                <button
                  key={floor}
                  type="button"
                  onClick={() => setActiveFloor(floor)}
                  className={`relative px-3.5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'bg-[#f4fbf7] text-[#4f675a] hover:text-[#072619] border border-[#E5ECE8]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-floor-pill"
                      className="absolute inset-0 bg-[#072619] rounded-full shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <Button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="h-8 px-3 rounded-full bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#a3e04f]" />
              <span className="hidden sm:inline">QR Tent Cards</span>
              <span className="sm:hidden">QR</span>
            </Button>
            <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#cdeeb0]/50 border border-[#0f8a5f]/25 text-[#072619]">
              <span className="w-2 h-2 rounded-full bg-[#0f8a5f]" /> Available
            </span>
            <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3E2] border border-[#FDE3B8] text-[#B45309]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Occupied
            </span>
          </div>
        </header>

        {/* Floor Map Layout Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-36 lg:pb-24 scrollbar-none">
          {bookingSuccess && (
            <div className="mb-4 p-3 rounded-2xl bg-[#cdeeb0] border border-[#0f8a5f]/30 text-[#072619] text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f8a5f]" />
              <span>{bookingSuccess}</span>
            </div>
          )}

          {/* Grid of Tables with Visual Timer Badges */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.025 } },
            }}
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5"
          >
            {tables.map((table, idx) => {
              const isSelected = selectedTable?.id === table.id;
              const isOccupiedOrReserved = table.status === 'occupied' || table.status === 'reserved';

              const demoGuests = [
                { name: 'Jacob Jones', time: '6:30 PM', guests: 4 },
                { name: 'Bessie Cooper', time: '6:30 PM', guests: 4 },
                { name: 'Ralph Edwards', time: '6:30 PM', guests: 4 },
                { name: 'Annette Black', time: '6:30 PM', guests: 6 },
              ];
              const guestInfo = demoGuests[idx % demoGuests.length];
              const timerLabel = getTableTimerLabel(table.table_number, (table as any).updated_at, idx);

              return (
                <motion.div
                  key={table.id}
                  variants={{
                    hidden: { opacity: 0, y: 12, scale: 0.98 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`border-2 border-dashed rounded-3xl p-2 sm:p-2.5 transition-all duration-200 cursor-pointer relative ${
                    isSelected
                      ? 'border-[#0f8a5f] ring-4 ring-[#0f8a5f]/15 bg-white/60'
                      : 'border-[#c8dad0] hover:border-[#0f8a5f]/50'
                  }`}
                >
                  {/* Inside Table Rectangle */}
                  <div
                    className={`rounded-2xl p-3 sm:p-4 w-full min-h-[132px] sm:min-h-[145px] flex flex-col justify-between shadow-xs transition-all ${
                      isOccupiedOrReserved
                        ? 'bg-[#FEF3E2] border border-[#FDE3B8]'
                        : 'bg-[#cdeeb0]/55 border border-[#0f8a5f]/25'
                    }`}
                  >
                    {/* Top Row: Table Badge & Visual Timer Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <div
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                          isOccupiedOrReserved
                            ? 'bg-[#F59E0B] text-white'
                            : 'bg-[#072619] text-[#a3e04f]'
                        }`}
                      >
                        {table.table_number}
                      </div>

                      {isOccupiedOrReserved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 border border-[#FDE3B8] text-[10px] font-black text-[#B45309] font-mono shadow-2xs">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{timerLabel}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#0f8a5f] uppercase tracking-wider">
                          Free
                        </span>
                      )}
                    </div>

                    {/* Middle: Guest details or seating capacity */}
                    <div className="my-2">
                      {isOccupiedOrReserved ? (
                        <div className="leading-tight">
                          <p className="text-xs font-extrabold text-[#072619] truncate">{guestInfo.name}</p>
                          <p className="text-[10px] text-[#4f675a] font-semibold">
                            {guestInfo.guests} Guests &bull; {guestInfo.time}
                          </p>
                        </div>
                      ) : (
                        <div className="leading-tight">
                          <p className="text-xs text-[#072619] font-extrabold">Table Ready</p>
                          <p className="text-[10px] text-[#4f675a] font-semibold flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" /> {table.seating_capacity || 4} Seats
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Pill */}
                    <div className="self-end">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block ${
                          isOccupiedOrReserved
                            ? 'bg-[#FDE3B8] text-[#B45309]'
                            : 'bg-[#0f8a5f] text-white'
                        }`}
                      >
                        {table.status === 'occupied' ? 'Occupied' : isOccupiedOrReserved ? 'Reserved' : 'Available'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Desktop Bottom Pinned Live Kitchen Orders Strip */}
        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-[#E5ECE8] px-4 items-center gap-3 overflow-x-auto scrollbar-none shadow-sm z-20">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4f675a] whitespace-nowrap shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0f8a5f] animate-pulse" />
            Live Kitchen:
          </span>

          {liveOrders.length === 0 ? (
            <span className="text-xs text-[#4f675a]">No active kitchen orders.</span>
          ) : (
            <AnimatePresence>
              {liveOrders.map((ord) => (
                <motion.div
                  key={ord.id}
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="px-3 py-1 rounded-full bg-[#f4fbf7] border border-[#E5ECE8] flex items-center gap-2 shrink-0"
                >
                  <div className="w-6 h-6 rounded-full bg-[#072619] text-[#a3e04f] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                    {ord.table_number || 'T1'}
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-[11px] font-bold text-[#072619] truncate max-w-[110px]">
                      {ord.customer_name || ord.order_number}
                    </p>
                    <p className="text-[9px] text-[#4f675a]">
                      {ord.items_count} items &rarr; KDS
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      ord.kds_status === 'ready'
                        ? 'bg-[#cdeeb0] text-[#072619]'
                        : 'bg-[#FEF3E2] text-[#B45309]'
                    }`}
                  >
                    {ord.kds_status === 'ready' ? 'Ready' : 'Prep'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Desktop Right Booking / Table Details Panel */}
      <aside className="hidden lg:flex w-[370px] xl:w-[390px] bg-white border-l border-[#E5ECE8] flex-col justify-between h-full shrink-0 shadow-lg z-20">
        <div className="p-6 space-y-5 overflow-y-auto scrollbar-none">
          <div className="flex items-center justify-between border-b border-[#E5ECE8] pb-4">
            <h2 className="font-display text-lg font-extrabold text-[#072619] tracking-tight">Table Captain</h2>
            <div className="px-3 py-1 rounded-xl bg-[#072619] text-[#a3e04f] text-sm font-black font-mono">
              {selectedTable ? `T${selectedTable.table_number.replace(/\D/g, '') || selectedTable.table_number}` : 'T1'}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#4f675a] mb-1.5 uppercase tracking-wide">
                Guest Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest full name..."
                className="w-full h-11 px-4 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold text-[#072619] focus:outline-none focus:border-[#0f8a5f] focus:ring-1 focus:ring-[#0f8a5f]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#4f675a] mb-1.5 uppercase tracking-wide">
                Party Size (Guests)
              </label>
              <div className="flex items-center justify-between h-11 px-4 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8]">
                <button
                  type="button"
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-7 h-7 rounded-full bg-[#0f8a5f] text-white flex items-center justify-center font-bold hover:bg-[#0b6f4c] transition shadow-xs cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-extrabold text-[#072619] font-mono">
                  {guestCount}
                </span>
                <button
                  type="button"
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="w-7 h-7 rounded-full bg-[#0f8a5f] text-white flex items-center justify-center font-bold hover:bg-[#0b6f4c] transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#4f675a] mb-1.5 uppercase tracking-wide">
                  Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold text-[#072619] focus:outline-none focus:border-[#0f8a5f]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4f675a] mb-1.5 uppercase tracking-wide">
                  Time
                </label>
                <input
                  type="text"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  placeholder="08:30 PM"
                  className="w-full h-11 px-3 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold text-[#072619] focus:outline-none focus:border-[#0f8a5f]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#E5ECE8] space-y-2.5 bg-[#f4fbf7]/60">
          <Button
            type="button"
            onClick={handleOpenPosOrder}
            className="w-full h-13 bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-display font-extrabold text-sm rounded-2xl shadow-lg shadow-[#0f8a5f]/20 transition cursor-pointer"
          >
            Open POS Order (Table {selectedTable?.table_number || ''})
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleBookTable}
            className="w-full h-11 bg-[#cdeeb0]/50 hover:bg-[#cdeeb0] text-[#072619] font-bold text-xs rounded-2xl border border-[#0f8a5f]/25 transition cursor-pointer"
          >
            Reserve / Book Table
          </Button>
        </div>
      </aside>

      {/* Mobile / Tablet Captain App Sticky Bottom Action Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-16 right-0 bg-white/95 backdrop-blur-md border-t border-[#E5ECE8] px-3 py-2.5 z-30 shadow-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#072619] text-[#a3e04f] font-black text-xs flex items-center justify-center shrink-0">
            {selectedTable ? `T${selectedTable.table_number.replace(/\D/g, '') || selectedTable.table_number}` : 'T1'}
          </div>
          <div className="leading-tight truncate">
            <p className="text-xs font-extrabold text-[#072619] truncate">
              Table {selectedTable?.table_number || '1'}
            </p>
            <p className="text-[10px] text-[#4f675a] capitalize">
              {selectedTable?.status || 'available'} &bull; {selectedTable?.seating_capacity || 4} seats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsMobileSheetOpen(true)}
            className="h-10 px-3 rounded-xl border-[#E5ECE8] bg-[#f4fbf7] text-[#072619] text-xs font-bold flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0f8a5f]" />
            <span>Book</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenPosOrder}
            className="h-10 px-4 rounded-xl bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-[#0f8a5f]/25"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#a3e04f]" />
            <span>Order</span>
          </Button>
        </div>
      </div>

      {/* Mobile Booking Drawer Sheet */}
      <AnimatePresence>
        {isMobileSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="w-full bg-white rounded-t-3xl p-5 border-t border-[#E5ECE8] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E5ECE8] pb-3">
                <h3 className="font-display text-base font-extrabold text-[#072619]">
                  Reserve Table {selectedTable?.table_number}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#f4fbf7] text-[#4f675a] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest full name..."
                  className="w-full h-11 px-4 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold text-[#072619]"
                />
                <div className="flex items-center justify-between h-11 px-4 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8]">
                  <span className="text-xs font-bold text-[#4f675a]">Guests</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="w-7 h-7 rounded-full bg-[#0f8a5f] text-white flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-sm">{guestCount}</span>
                    <button
                      type="button"
                      onClick={() => setGuestCount(guestCount + 1)}
                      className="w-7 h-7 rounded-full bg-[#0f8a5f] text-white flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="h-11 px-3 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="h-11 px-3 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleBookTable}
                className="w-full h-12 bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-bold rounded-2xl"
              >
                Confirm Reservation
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Tent Cards Print Modal */}
      <QrTentCardsModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        tables={tables}
        selectedTable={selectedTable}
      />
    </div>
  );
}
