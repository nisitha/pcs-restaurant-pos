'use client';

import React, { useState, useEffect } from 'react';
import { DiningTable, TableStatus } from '@/types/table.types';
import { Users, Clock, CheckCircle2, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableCardProps {
  table: DiningTable;
  onStatusChange: (tableId: string, nextStatus: TableStatus) => void;
  onSelectTable?: (table: DiningTable) => void;
}

export function TableCard({ table, onStatusChange, onSelectTable }: TableCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Compute elapsed dining timer for occupied tables
  useEffect(() => {
    if (table.status !== 'occupied') {
      setElapsedMinutes(0);
      return;
    }

    const startTime = table.dining_started_at ? new Date(table.dining_started_at).getTime() : Date.now() - 25 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = now - startTime;
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      setElapsedMinutes(mins);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [table.status, table.dining_started_at]);

  const statusStyles: Record<
    TableStatus,
    { border: string; bg: string; badge: string; label: string; icon: any }
  > = {
    available: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      bg: 'bg-emerald-950/10',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Available',
      icon: CheckCircle2,
    },
    occupied: {
      border: 'border-rose-500/40 hover:border-rose-500/70',
      bg: 'bg-rose-950/20',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'Occupied',
      icon: Users,
    },
    reserved: {
      border: 'border-blue-500/30 hover:border-blue-500/60',
      bg: 'bg-blue-950/10',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      label: 'Reserved',
      icon: UserCheck,
    },
    cleaning: {
      border: 'border-purple-500/30 hover:border-purple-500/60',
      bg: 'bg-purple-950/15',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      label: 'Cleaning',
      icon: Sparkles,
    },
  };

  const style = statusStyles[table.status];
  const StatusIcon = style.icon;

  return (
    <div
      onClick={() => onSelectTable && onSelectTable(table)}
      className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg ${style.border} ${style.bg} bg-zinc-900/90`}
    >
      <div>
        {/* Top: Table Number & Status Pill */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight">{table.table_number}</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700">
              <Users className="w-3 h-3 text-zinc-400" />
              {table.seating_capacity} seats
            </span>
          </div>

          <span
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}
          >
            <StatusIcon className="w-3 h-3" />
            {style.label}
          </span>
        </div>

        {/* Center: Occupied Details & Elapsed Timer */}
        {table.status === 'occupied' && (
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 mb-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Dining Time:
              </span>
              <span className="font-bold text-amber-400 font-mono">
                {elapsedMinutes >= 60
                  ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
                  : `${elapsedMinutes} mins`}
              </span>
            </div>
            {table.order_number && (
              <div className="text-[10px] text-zinc-400 truncate">
                Order: <strong className="text-white">{table.order_number}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Quick Status Actions */}
      <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
        {table.status === 'available' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(table.id, 'occupied')}
              className="flex-1 h-7 text-xs font-semibold bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            >
              Seat Guests
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(table.id, 'reserved')}
              className="h-7 text-xs text-zinc-400 hover:text-white"
            >
              Reserve
            </Button>
          </>
        )}

        {table.status === 'occupied' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(table.id, 'cleaning')}
            className="w-full h-7 text-xs font-semibold bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
          >
            Guests Departed &bull; Mark Cleaning
          </Button>
        )}

        {table.status === 'cleaning' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(table.id, 'available')}
            className="w-full h-7 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
          >
            Cleaned & Ready &bull; Mark Available
          </Button>
        )}

        {table.status === 'reserved' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(table.id, 'occupied')}
              className="flex-1 h-7 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            >
              Seat Reserved
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(table.id, 'available')}
              className="h-7 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
