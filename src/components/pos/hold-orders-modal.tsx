'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { formatLKR } from '@/lib/utils/currency';
import { formatRestaurantDateTime } from '@/lib/utils/datetime';
import { PauseCircle, Play, Trash2, Clock, Utensils } from 'lucide-react';

interface HoldOrdersModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HoldOrdersModal({ isOpen, onOpenChange }: HoldOrdersModalProps) {
  const { heldOrders, resumeOrder, deleteHeldOrder } = useCartStore();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-amber-500" />
            <DialogTitle className="text-xl font-bold">Parked / Held Orders</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-xs">
            Resume pending customer carts without losing ringing progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
          {heldOrders.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
              <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-zinc-400">No held orders right now.</p>
            </div>
          ) : (
            heldOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">
                      {order.order_type === 'dine_in'
                        ? `Table ${order.table_number || 'Dine-In'}`
                        : order.order_type === 'takeaway'
                        ? `Takeaway: ${order.customer_name || 'Customer'}`
                        : `Delivery: ${order.customer_name || 'Customer'}`}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                      {order.items.length} items
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    Parked at: {formatRestaurantDateTime(order.held_at, 'time')}
                  </p>
                  <p className="text-xs font-bold text-amber-400 mt-0.5">
                    {formatLKR(order.total_amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteHeldOrder(order.id)}
                    className="text-zinc-500 hover:text-rose-400 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      resumeOrder(order.id);
                      onOpenChange(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 h-8"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
