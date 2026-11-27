'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Users, AlertCircle } from 'lucide-react';
import { RestaurantFloor } from '@/types/table.types';

interface TableEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  floors: RestaurantFloor[];
  onSave: (table: { floor_id: string; table_number: string; seating_capacity: number }) => Promise<boolean>;
}

export function TableEditDialog({
  isOpen,
  onOpenChange,
  floors,
  onSave,
}: TableEditDialogProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('4');
  const [floorId, setFloorId] = useState(floors[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const capacity = parseInt(seatingCapacity);
    if (!tableNumber.trim() || isNaN(capacity) || capacity < 1 || !floorId) {
      setError('Please provide a valid table number and seating capacity.');
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onSave({
        floor_id: floorId,
        table_number: tableNumber.trim(),
        seating_capacity: capacity,
      });

      if (!success) {
        throw new Error('Failed to create table. Table number might already exist.');
      }

      setTableNumber('');
      setSeatingCapacity('4');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving table';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-md rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#119C49]" /> Add Dining Table
          </DialogTitle>
          <DialogDescription className="text-[#7C828D] text-xs">
            Configure seating capacity and floor location for this dining table.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Floor Section <span className="text-rose-500">*</span>
            </label>
            <select
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              className="w-full h-10 rounded-xl bg-[#F8F9FA] border border-[#EBECEF] text-[#1A1D1F] text-xs px-3 focus:outline-none focus:ring-1 focus:ring-[#119C49]"
              required
            >
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Table Identifier / Number <span className="text-rose-500">*</span>
            </label>
            <Input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. T9, VIP-1"
              className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] text-xs uppercase h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Seating Capacity (Guests)
            </label>
            <Input
              type="number"
              min="1"
              max="30"
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(e.target.value)}
              className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] text-xs font-bold h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
              required
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#EBECEF] flex sm:flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F8F9FA] rounded-2xl h-11 px-5 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold rounded-2xl h-11 px-6 shadow-sm flex-1 sm:flex-initial"
            >
              {isSubmitting ? 'Adding Table...' : 'Save Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
