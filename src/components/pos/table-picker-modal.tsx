'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
    available: { border: 'border-emerald-200 hover:border-[#119C49]', bg: 'bg-[#D1F0DC]/40', text: 'text-emerald-700 font-bold' },
    occupied: { border: 'border-rose-200 hover:border-rose-400', bg: 'bg-rose-50', text: 'text-rose-600 font-bold' },
    reserved: { border: 'border-amber-200 hover:border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700 font-bold' },
    cleaning: { border: 'border-purple-200 hover:border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700 font-bold' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-2xl rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight">Select Dining Table</DialogTitle>
              <span className="text-xs font-semibold text-[#7C828D] bg-[#F8F9FA] px-2.5 py-1 rounded-full border border-[#EBECEF]">
                Main Dining Hall
              </span>
            </div>
            <DialogDescription className="text-xs text-[#7C828D]">
              Assign this cart to an active table for dine-in service.
            </DialogDescription>
          </div>
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
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-28 ${
                  isSelected
                    ? 'ring-2 ring-[#119C49] bg-[#D1F0DC]/70 border-[#119C49] shadow-sm'
                    : `${style.border} ${style.bg} hover:shadow-xs`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-[#1A1D1F]">{table.table_number}</span>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${style.text}`}>
                    {table.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#7C828D]">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-medium">{table.seating_capacity} seats</span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
