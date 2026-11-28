'use client';

import React from 'react';
import {
  ChefHat,
  CheckCircle2,
  RotateCcw,
  Utensils,
  ShoppingBag,
  Truck,
  AlertTriangle,
  Flame,
  Coffee,
  IceCream,
  CircleDot,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { KDSTicket } from '@/types/kds.types';
import { ElapsedTimer } from './elapsed-timer';

interface TicketCardProps {
  ticket: KDSTicket;
  onStart: (ticketId: string) => void;
  onReady: (ticketId: string) => void;
  onRecall?: (ticketId: string) => void;
  isActionLoading?: boolean;
}

export function TicketCard({
  ticket,
  onStart,
  onReady,
  onRecall,
  isActionLoading = false,
}: TicketCardProps) {
  const stationColors: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
    HOT: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-300',
      border: 'border-orange-400/30',
      icon: Flame,
    },
    GRILL: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-400/30',
      icon: ChefHat,
    },
    BEV: {
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-300',
      border: 'border-cyan-400/30',
      icon: Coffee,
    },
    DESSERT: {
      bg: 'bg-pink-500/15',
      text: 'text-pink-300',
      border: 'border-pink-400/30',
      icon: IceCream,
    },
  };

  const currentStation = stationColors[ticket.station_code] || {
    bg: 'bg-white/10',
    text: 'text-[#a3e04f]',
    border: 'border-white/15',
    icon: Utensils,
  };
  const StationIcon = currentStation.icon;

  const isDineIn = ticket.order_type === 'dine_in';
  const isTakeaway = ticket.order_type === 'takeaway';
  const isDelivery = ticket.order_type === 'delivery';

  const isSubmitted = ticket.status === 'submitted';
  const isPreparing = ticket.status === 'in_preparation';
  const isReady = ticket.status === 'ready';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col justify-between rounded-3xl bg-white border-2 transition-all duration-200 shadow-md overflow-hidden ${
        isSubmitted
          ? 'border-[#F59E0B] shadow-amber-500/10'
          : isPreparing
          ? 'border-[#0f8a5f] shadow-[#0f8a5f]/15'
          : 'border-[#E5ECE8]'
      }`}
    >
      {/* High-Contrast Deep Forest Ticket Header */}
      <div className="p-4 bg-[#072619] text-white">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider border flex items-center gap-1 ${currentStation.bg} ${currentStation.text} ${currentStation.border}`}
            >
              <StationIcon className="w-3 h-3" />
              {ticket.station_code}
            </span>
            <span className="text-xs font-mono font-bold text-white/70">
              {ticket.ticket_number}
            </span>
          </div>

          {/* Color-coded Live Elapsed Timer */}
          <ElapsedTimer startTime={ticket.created_at} />
        </div>

        {/* Order Info & Destination */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="font-display text-sm font-black text-white tracking-tight whitespace-nowrap">
              {ticket.order_number}
            </span>
            {isDineIn && ticket.table_number && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#a3e04f] text-[#072619] text-xs font-black flex items-center gap-1 shrink-0">
                <Utensils className="w-3 h-3" />
                T{ticket.table_number}
              </span>
            )}
            {isTakeaway && (
              <span className="px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30 text-xs font-bold flex items-center gap-1 shrink-0">
                <ShoppingBag className="w-3 h-3" />
                Takeaway
              </span>
            )}
            {isDelivery && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/30 text-xs font-bold flex items-center gap-1 shrink-0">
                <Truck className="w-3 h-3" />
                Delivery
              </span>
            )}
          </div>

          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
              isSubmitted
                ? 'bg-amber-400 text-[#072619]'
                : isPreparing
                ? 'bg-[#0f8a5f] text-white'
                : 'bg-[#cdeeb0] text-[#072619]'
            }`}
          >
            {ticket.status.replace('_', ' ')}
          </span>
        </div>

        {ticket.customer_name && (
          <p className="text-[11px] text-white/70 mt-1.5 truncate">
            Guest: <span className="text-white font-bold">{ticket.customer_name}</span>
          </p>
        )}
      </div>

      {/* Ticket Body / Order Items */}
      <div className="p-3.5 space-y-2 flex-1 overflow-y-auto max-h-[320px] scrollbar-none bg-[#f4fbf7]/40">
        {ticket.items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-3 rounded-2xl bg-white border border-[#E5ECE8] shadow-2xs"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#072619] text-[#a3e04f] font-black text-sm flex items-center justify-center shrink-0 font-mono">
                {item.quantity}x
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-[#072619] leading-snug">
                  {item.item_name}
                </p>
                {item.variant_name && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f4fbf7] text-[#0f8a5f] border border-[#E5ECE8]">
                    Portion: {item.variant_name}
                  </span>
                )}
              </div>
            </div>

            {/* Modifiers List */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="mt-2 pl-10 space-y-0.5">
                {item.modifiers.map((mod, mIdx) => (
                  <p key={mIdx} className="text-[11px] text-[#B45309] font-bold flex items-center gap-1">
                    <CircleDot className="w-2.5 h-2.5 text-[#F59E0B]" />
                    <span>{mod.name}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Special Instructions */}
            {item.notes && (
              <div className="mt-2 pl-10">
                <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>{item.notes}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {ticket.order_notes && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="block font-black uppercase text-[10px] tracking-wide text-rose-600">Order Note</span>
              <span>{ticket.order_notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Touch-Friendly Footer Actions */}
      <div className="p-3.5 border-t border-[#E5ECE8] bg-white flex items-center gap-2">
        {isSubmitted && (
          <motion.div whileTap={{ scale: 0.97 }} className="w-full">
            <Button
              type="button"
              disabled={isActionLoading}
              onClick={() => onStart(ticket.id)}
              className="w-full h-13 bg-[#F59E0B] hover:bg-[#D97706] text-[#072619] font-display font-black text-sm rounded-2xl gap-2 shadow-md transition cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>START PREP</span>
            </Button>
          </motion.div>
        )}

        {isPreparing && (
          <motion.div whileTap={{ scale: 0.97 }} className="w-full">
            <Button
              type="button"
              disabled={isActionLoading}
              onClick={() => onReady(ticket.id)}
              className="w-full h-13 bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-display font-black text-sm rounded-2xl gap-2 shadow-md shadow-[#0f8a5f]/25 transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-[#a3e04f]" />
              <span>BUMP / READY</span>
            </Button>
          </motion.div>
        )}

        {isReady && (
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#072619] text-xs font-extrabold px-3 py-2 bg-[#cdeeb0] rounded-xl border border-[#0f8a5f]/25">
              <CheckCircle2 className="w-4 h-4 text-[#0f8a5f]" />
              <span>Ready at Pass</span>
            </div>
            {onRecall && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isActionLoading}
                onClick={() => onRecall(ticket.id)}
                className="h-11 px-4 bg-white border-[#E5ECE8] text-[#4f675a] hover:text-[#072619] hover:bg-[#f4fbf7] text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recall</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
