'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useBranchStore } from '@/stores/branch-store';

interface BoardOrder {
  id: string;
  order_number: string;
  order_type: string;
  kds_status: string;
  table_number: string | null;
  customer_name: string | null;
  items_count: number;
  created_at: string;
}

export default function OrderReadyBoardPage() {
  const { activeBranchId, activeBranch } = useBranchStore();

  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<string>('');
  const [isLive, setIsLive] = useState<boolean>(false);

  const prevReadyIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedRef = useRef<boolean>(false);

  // Pleasant two-tone Web Audio API chime when an order transitions to Ready
  const playReadyChime = useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const notes = [587.33, 880]; // D5 -> A5 bright chime
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.46);
      });
    } catch {
      // Audio playback blocked by browser autoplay policy before user interaction
    }
  }, [isMuted]);

  const fetchBoardOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          kds_status,
          created_at,
          customers (name),
          dining_tables (table_number),
          order_items (id, quantity)
        `)
        .eq('branch_id', activeBranchId || '00000000-0000-0000-0000-000000000001')
        .in('kds_status', ['submitted', 'in_preparation', 'partially_ready', 'ready'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const formatted: BoardOrder[] = data.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          order_type: o.order_type,
          kds_status: o.kds_status,
          table_number: o.dining_tables?.table_number || null,
          customer_name: o.customers?.name || null,
          items_count: (o.order_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
          created_at: o.created_at,
        }));

        const nextReadyIds = new Set(
          formatted.filter((o) => o.kds_status === 'ready').map((o) => o.id)
        );

        if (hasHydratedRef.current) {
          let newlyReady = false;
          nextReadyIds.forEach((id) => {
            if (!prevReadyIdsRef.current.has(id)) {
              newlyReady = true;
            }
          });
          if (newlyReady) {
            playReadyChime();
          }
        }
        hasHydratedRef.current = true;
        prevReadyIdsRef.current = nextReadyIds;
        setOrders(formatted);
      }
    } catch (err) {
      console.error('Failed to load ORB orders:', err);
    }
  }, [activeBranchId, playReadyChime]);

  useEffect(() => {
    fetchBoardOrders();
    const supabase = createClient();
    const channel = supabase
      .channel('orb-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchBoardOrders();
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    const poll = setInterval(fetchBoardOrders, 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [fetchBoardOrders]);

  useEffect(() => {
    const updateClock = () => {
      setNowTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const preparingOrders = orders.filter((o) =>
    ['submitted', 'in_preparation', 'partially_ready'].includes(o.kds_status)
  );
  const readyOrders = orders.filter((o) => o.kds_status === 'ready');

  const getTokenLabel = (ord: BoardOrder) => {
    const parts = ord.order_number.split('-');
    return parts[parts.length - 1] || ord.order_number;
  };

  return (
    <div className="min-h-screen w-screen bg-[#072619] text-white flex flex-col overflow-hidden">
      {/* Top TV Header Bar */}
      <header className="px-6 sm:px-10 py-4 bg-[#0b3d2c]/60 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0f8a5f] text-[#a3e04f] flex items-center justify-center shadow-lg border border-[#a3e04f]/30">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                PCS Bill <span className="text-[#a3e04f]">Order Ready Board</span>
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 border ${
                  isLive
                    ? 'bg-[#0f8a5f]/30 text-[#a3e04f] border-[#a3e04f]/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#a3e04f] animate-pulse' : 'bg-amber-400'}`} />
                {isLive ? 'LIVE' : 'SYNCING'}
              </span>
            </div>
            <p className="text-xs text-[#cdeeb0]/80 font-medium">
              {activeBranch?.name || 'Colombo Main'} &bull; Please watch your token number
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:block font-mono text-xl font-black text-[#a3e04f] bg-[#072619] px-4 py-2 rounded-2xl border border-white/10">
            {nowTime}
          </span>

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-[#a3e04f]" />}
            <span className="hidden sm:inline">{isMuted ? 'Chime Muted' : 'Chime Active'}</span>
          </button>

          <Link
            href="/pos"
            className="h-11 px-4 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
            title="Return to Counter POS"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">POS</span>
          </Link>
        </div>
      </header>

      {/* Main Split Columns */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 overflow-y-auto scrollbar-none">
        {/* LEFT COLUMN: PREPARING (5 cols) */}
        <section className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black text-white tracking-tight">Preparing</h2>
                <p className="text-xs text-white/60">In kitchen preparation</p>
              </div>
            </div>
            <span className="px-3.5 py-1 rounded-full bg-[#F59E0B] text-[#072619] font-mono text-sm font-black">
              {preparingOrders.length}
            </span>
          </div>

          {preparingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-white/50">
              <Clock className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-base font-bold">No Orders in Kitchen Queue</p>
              <p className="text-xs mt-1">New counter and kiosk orders appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3.5 content-start">
              <AnimatePresence>
                {preparingOrders.map((ord) => (
                  <motion.div
                    key={ord.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 rounded-2xl bg-[#0b3d2c]/80 border border-[#F59E0B]/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-black uppercase tracking-wider mb-1">
                        {ord.order_type === 'dine_in' && ord.table_number
                          ? `Table ${ord.table_number}`
                          : ord.order_type.replace('_', ' ')}
                      </span>
                      <p className="font-display text-3xl font-black text-white font-mono tracking-tight">
                        #{getTokenLabel(ord)}
                      </p>
                      {ord.customer_name && (
                        <p className="text-xs text-white/70 truncate max-w-[140px] mt-0.5">
                          {ord.customer_name}
                        </p>
                      )}
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-[#FEF3E2] text-[#B45309] text-[10px] font-black uppercase">
                      Cooking
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: READY TO COLLECT (7 cols) */}
        <section className="lg:col-span-7 bg-[#f4fbf7] text-[#072619] rounded-3xl p-6 flex flex-col shadow-2xl border-2 border-[#a3e04f]">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5ECE8]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0f8a5f] text-[#a3e04f] flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-3xl font-black text-[#072619] tracking-tight flex items-center gap-2">
                  <span>Ready to Collect</span>
                  <Sparkles className="w-5 h-5 text-[#0f8a5f]" />
                </h2>
                <p className="text-xs text-[#4f675a] font-semibold">Please proceed to the pickup counter</p>
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-[#072619] text-[#a3e04f] font-mono text-base font-black">
              {readyOrders.length} Ready
            </span>
          </div>

          {readyOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[#4f675a]">
              <ShoppingBag className="w-14 h-14 mb-3 opacity-30 text-[#0f8a5f]" />
              <p className="font-display text-lg font-extrabold text-[#072619]">Waiting for Ready Orders</p>
              <p className="text-xs mt-1">Orders bumped from KDS will highlight here with a chime.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
              <AnimatePresence>
                {readyOrders.map((ord) => (
                  <motion.div
                    key={ord.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    className="p-5 rounded-3xl bg-[#072619] text-white border-2 border-[#a3e04f] shadow-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#a3e04f] text-[#072619] text-[11px] font-black uppercase tracking-wider">
                          READY NOW
                        </span>
                        <span className="text-xs font-bold text-[#cdeeb0] flex items-center gap-1">
                          {ord.order_type === 'delivery' ? (
                            <Bike className="w-3.5 h-3.5" />
                          ) : (
                            <ShoppingBag className="w-3.5 h-3.5" />
                          )}
                          {ord.table_number ? `Table ${ord.table_number}` : ord.order_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-display text-4xl sm:text-5xl font-black text-[#a3e04f] font-mono tracking-tight">
                        #{getTokenLabel(ord)}
                      </p>
                      {ord.customer_name && (
                        <p className="text-sm font-bold text-white/90 mt-1 truncate max-w-[200px]">
                          {ord.customer_name}
                        </p>
                      )}
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-[#0f8a5f] text-[#a3e04f] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Ticker Footer */}
      <footer className="px-8 py-2.5 bg-[#0b3d2c]/60 border-t border-white/10 flex items-center justify-between text-xs text-white/60 shrink-0">
        <span>Powered by Pixel Craft Studios &bull; pcsbill.com</span>
        <span>Hotline / WhatsApp: +94 78 76 76 576</span>
      </footer>
    </div>
  );
}
