'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTableStore } from '@/stores/table-store';
import { DiningTable, TableStatus } from '@/types/table.types';
import { Users, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';

interface TablePickerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTableId: string | null;
  onSelectTable: (tableId: string, tableNumber: string) => void;
}

export function TablePickerModal({
  isOpen,
  onOpenChange,
  selectedTableId,
  onSelectTable,
}: TablePickerModalProps) {
  const { tables, fetchTables, isLoading } = useTableStore();

  useEffect(() => {
    if (isOpen) {
      fetchTables();
    }
  }, [isOpen, fetchTables]);

  const statusColors: Record<TableStatus, { border: string; bg: string; text: string }> = {
    available: { border: 'border-emerald-500/40 hover:border-emerald-500', bg: 'bg-emerald-950/20', text: 'text-emerald-400' },
    occupied: { border: 'border-rose-500/30 hover:border-rose-500', bg: 'bg-rose-950/20', text: 'text-rose-400' },
    reserved: { border: 'border-blue-500/30 hover:border-blue-500', bg: 'bg-blue-950/20', text: 'text-blue-400' },
    cleaning: { border: 'border-purple-500/30 hover:border-purple-500', bg: 'bg-purple-950/20', text: 'text-purple-400' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Select Dining Table</span>
            <span className="text-xs font-normal text-zinc-400">Main Dining Hall</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {tables.map((table) => {
            const isSelected = selectedTableId === table.id;
            const style = statusColors[table.status];

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => {
                  onSelectTable(table.id, table.table_number);
                  onOpenChange(false);
                }}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between h-28 ${
                  isSelected
                    ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-400'
                    : `${style.border} ${style.bg} bg-zinc-900/80`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-white">{table.table_number}</span>
                  <span className={`text-[10px] font-bold uppercase ${style.text}`}>
                    {table.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{table.seating_capacity} seats</span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
