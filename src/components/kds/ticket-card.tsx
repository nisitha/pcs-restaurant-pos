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
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      icon: Flame,
    },
    GRILL: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
      icon: ChefHat,
    },
    BEV: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      icon: Coffee,
    },
    DESSERT: {
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
      icon: IceCream,
    },
  };

  const currentStation = stationColors[ticket.station_code] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
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
      className={`flex flex-col justify-between rounded-3xl bg-white border transition-all duration-200 shadow-sm overflow-hidden ${
        isSubmitted
          ? 'border-amber-300 ring-2 ring-amber-400/10'
          : isPreparing
          ? 'border-blue-300 ring-2 ring-blue-400/10'
          : 'border-[#119C49] ring-2 ring-[#119C49]/15'
      }`}
    >
      {/* Ticket Header */}
      <div className="p-4 border-b border-[#F4F5F7] bg-[#FAFAFC]">
        <div className="flex items-center justify-between mb-2">
          {/* Station Badge + Ticket Number */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider border flex items-center gap-1 ${currentStation.bg} ${currentStation.text} ${currentStation.border}`}
            >
              <StationIcon className="w-3 h-3" />
              {ticket.station_code}
            </span>
            <span className="text-xs font-mono font-bold text-[#7C828D]">
              {ticket.ticket_number}
            </span>
          </div>

          {/* Live Elapsed Timer */}
          <ElapsedTimer startTime={ticket.created_at} />
        </div>

        {/* Order Info & Destination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#1A1D1F] tracking-tight">
              {ticket.order_number}
            </span>
            {isDineIn && ticket.table_number && (
              <span className="px-2 py-0.5 rounded-full bg-[#D1F0DC] text-[#119C49] text-xs font-bold flex items-center gap-1 border border-[#BDE8CB]">
                <Utensils className="w-3 h-3" />
                Table {ticket.table_number}
              </span>
            )}
            {isTakeaway && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" />
                Takeaway
              </span>
            )}
            {isDelivery && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 text-xs font-bold flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Delivery
              </span>
            )}
          </div>

          {/* Ticket Status Pill */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              isSubmitted
                ? 'bg-[#FEF3E2] text-[#F59E0B]'
                : isPreparing
                ? 'bg-blue-50 text-blue-600'
                : 'bg-[#D1F0DC] text-[#119C49]'
            }`}
          >
            {ticket.status.replace('_', ' ')}
          </span>
        </div>

        {ticket.customer_name && (
          <p className="text-[11px] text-[#7C828D] mt-1 truncate">
            Customer: <span className="text-[#1A1D1F] font-bold">{ticket.customer_name}</span>
          </p>
        )}
      </div>

      {/* Ticket Body / Order Items */}
      <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-[320px] scrollbar-none">
        {ticket.items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white text-[#119C49] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#EBECEF] font-mono">
                  {item.quantity}x
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1A1D1F] leading-tight">
                    {item.item_name}
                  </p>
                  {item.variant_name && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-[#7C828D] border border-[#EBECEF]">
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
                  <p key={mIdx} className="text-[11px] text-[#F59E0B] font-semibold flex items-center gap-1">
                    <CircleDot className="w-2.5 h-2.5 text-[#F59E0B]" />
                    <span>{mod.name}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Special Instructions */}
            {item.notes && (
              <div className="mt-2 pl-9">
                <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>{item.notes}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {ticket.order_notes && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div>
              <span className="block font-bold uppercase text-[10px] tracking-wide text-rose-600">Order Note</span>
              <span>{ticket.order_notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Footer Actions */}
      <div className="p-3.5 border-t border-[#F4F5F7] bg-[#FAFAFC] flex items-center gap-2">
        {isSubmitted && (
          <Button
            type="button"
            disabled={isActionLoading}
            onClick={() => onStart(ticket.id)}
            className="w-full h-12 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs rounded-2xl gap-2 shadow-md transition"
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
            className="w-full h-12 bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-2xl gap-2 shadow-md transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Ready for Pickup</span>
          </Button>
        )}

        {isReady && (
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#119C49] text-xs font-bold px-3 py-1.5 bg-[#D1F0DC] rounded-xl border border-[#BDE8CB]">
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
                className="h-10 px-4 bg-white border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F6F7F9] text-xs font-bold rounded-xl gap-1.5"
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
