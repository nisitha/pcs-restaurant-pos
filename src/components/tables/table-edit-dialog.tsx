'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-500" /> Add Dining Table
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Floor Section <span className="text-rose-400">*</span>
            </label>
            <select
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Table Identifier / Number <span className="text-rose-400">*</span>
            </label>
            <Input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. T9, VIP-1"
              className="bg-zinc-900 border-zinc-800 text-white text-xs uppercase"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Seating Capacity (Guests)
            </label>
            <Input
              type="number"
              min="1"
              max="30"
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white text-xs font-semibold"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
            >
              {isSubmitting ? 'Adding Table...' : 'Save Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
