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
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-xl rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="flex items-center gap-2 mb-1">
            <PauseCircle className="w-5 h-5 text-[#119C49]" />
            <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight">Parked / Held Orders</DialogTitle>
          </div>
          <DialogDescription className="text-[#7C828D] text-xs">
            Resume pending customer carts without losing ringing progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
          {heldOrders.length === 0 ? (
            <div className="p-8 text-center text-[#7C828D] border border-dashed border-[#EBECEF] bg-[#F8F9FA] rounded-2xl">
              <Utensils className="w-8 h-8 mx-auto mb-2 text-[#7C828D]/50" />
              <p className="text-sm font-semibold text-[#1A1D1F]">No held orders right now.</p>
              <p className="text-xs text-[#7C828D] mt-0.5">Park active orders using the "Hold" button on the cart.</p>
            </div>
          ) : (
            heldOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF] flex items-center justify-between gap-4 hover:border-[#119C49]/40 hover:bg-white transition shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-[#1A1D1F]">
                      {order.order_type === 'dine_in'
                        ? `Table ${order.table_number || 'Dine-In'}`
                        : order.order_type === 'takeaway'
                        ? `Takeaway: ${order.customer_name || 'Customer'}`
                        : `Delivery: ${order.customer_name || 'Customer'}`}
                    </span>
                    <span className="text-[10px] text-[#7C828D] font-mono bg-white border border-[#EBECEF] px-2 py-0.5 rounded-full">
                      {order.items.length} items
                    </span>
                  </div>

                  <p className="text-xs text-[#7C828D] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#7C828D]" />
                    Parked at: {formatRestaurantDateTime(order.held_at, 'time')}
                  </p>
                  <p className="text-xs font-black text-[#119C49] mt-0.5">
                    {formatLKR(order.total_amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteHeldOrder(order.id)}
                    className="text-[#7C828D] hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      resumeOrder(order.id);
                      onOpenChange(false);
                    }}
                    className="bg-[#119C49] hover:bg-[#0E823D] text-white font-bold text-xs gap-1.5 h-8 px-3.5 rounded-xl shadow-xs"
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
