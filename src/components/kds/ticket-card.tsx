'use client';

import React from 'react';
import {
  ChefHat,
  CheckCircle2,
  Clock,
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
  const stationColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    HOT: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      icon: Flame,
    },
    GRILL: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      icon: ChefHat,
    },
    BEV: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: Coffee,
    },
    DESSERT: {
      bg: 'bg-pink-500/10',
      text: 'text-pink-400',
      border: 'border-pink-500/30',
      icon: IceCream,
    },
  };

  const currentStation = stationColors[ticket.station_code] || {
    bg: 'bg-zinc-800',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
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
    <div
      className={`flex flex-col justify-between rounded-2xl bg-zinc-900 border transition-all duration-200 shadow-lg overflow-hidden ${
        isSubmitted
          ? 'border-amber-500/40 shadow-amber-950/20'
          : isPreparing
          ? 'border-blue-500/40 shadow-blue-950/20 ring-1 ring-blue-500/20'
          : 'border-emerald-500/40 shadow-emerald-950/20 opacity-90'
      }`}
    >
      {/* Ticket Header */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between mb-2">
          {/* Station Badge + Ticket Number */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono uppercase tracking-wider border flex items-center gap-1 ${currentStation.bg} ${currentStation.text} ${currentStation.border}`}
            >
              <StationIcon className="w-3 h-3" />
              {ticket.station_code}
            </span>
            <span className="text-xs font-mono font-bold text-zinc-300">
              {ticket.ticket_number}
            </span>
          </div>

          {/* Live Elapsed Timer */}
          <ElapsedTimer startTime={ticket.created_at} />
        </div>

        {/* Order Info & Destination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-white tracking-tight">
              {ticket.order_number}
            </span>
            {isDineIn && ticket.table_number && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                <Utensils className="w-3 h-3" />
                Table {ticket.table_number}
              </span>
            )}
            {isTakeaway && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" />
                Takeaway
              </span>
            )}
            {isDelivery && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Delivery
              </span>
            )}
          </div>

          {/* Ticket Status Pill */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isSubmitted
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : isPreparing
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {ticket.status.replace('_', ' ')}
          </span>
        </div>

        {ticket.customer_name && (
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            Customer: <span className="text-zinc-200 font-medium">{ticket.customer_name}</span>
          </p>
        )}
      </div>

      {/* Ticket Body / Order Items */}
      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
        {ticket.items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-extrabold text-sm flex items-center justify-center shrink-0 border border-zinc-700">
                  {item.quantity}x
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {item.item_name}
                  </p>
                  {item.variant_name && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                      Portion: {item.variant_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modifiers List */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="mt-2 pl-9 space-y-0.5">
                {item.modifiers.map((mod, mIdx) => (
                  <p key={mIdx} className="text-xs text-amber-300/90 font-medium flex items-center gap-1">
                    <CircleDot className="w-2.5 h-2.5 text-amber-400" />
                    <span>{mod.name}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Item-level special notes */}
            {item.notes && (
              <div className="mt-2 pl-9">
                <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{item.notes}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Order-level special instructions */}
        {ticket.order_notes && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="block font-bold uppercase text-[10px] tracking-wider text-rose-400">Order Note</span>
              <span>{ticket.order_notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Footer Actions */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/70 flex items-center gap-2">
        {isSubmitted && (
          <Button
            type="button"
            disabled={isActionLoading}
            onClick={() => onStart(ticket.id)}
            className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-xl gap-2 shadow-md transition"
          >
            <Flame className="w-4 h-4" />
            <span>Accept / Start Prep</span>
          </Button>
        )}

        {isPreparing && (
          <Button
            type="button"
            disabled={isActionLoading}
            onClick={() => onReady(ticket.id)}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl gap-2 shadow-md transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Ready for Pickup</span>
          </Button>
        )}

        {isReady && (
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready at Station</span>
            </div>
            {onRecall && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isActionLoading}
                onClick={() => onRecall(ticket.id)}
                className="h-9 px-3 bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recall</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
