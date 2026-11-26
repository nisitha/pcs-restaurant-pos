'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChefHat, ArrowRight, Printer } from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';

interface OrderSuccessDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  totalAmount: number;
  stationsRouted: string[];
  onNewOrder: () => void;
}

export function OrderSuccessDialog({
  isOpen,
  onOpenChange,
  orderNumber,
  totalAmount,
  stationsRouted,
  onNewOrder,
}: OrderSuccessDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md text-center">
        <DialogHeader>
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-black text-center text-white">
            Order Sent to Kitchen!
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs text-zinc-400 block mb-0.5">Order Number</span>
            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
              {orderNumber}
            </span>
            <span className="text-sm font-semibold text-zinc-300 block mt-1">
              Total: {formatLKR(totalAmount)}
            </span>
          </div>

          {/* Kitchen Station Routing Feedback */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-left">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mb-2">
              <ChefHat className="w-4 h-4 text-orange-400" /> Auto-Routed to Kitchen Stations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {stationsRouted.length > 0 ? (
                stationsRouted.map((station, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30"
                  >
                    &bull; {station}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-400">Hot Kitchen</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.print();
            }}
            className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print KOT / Receipt</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              onNewOrder();
              onOpenChange(false);
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
          >
            <span>Next Customer</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
