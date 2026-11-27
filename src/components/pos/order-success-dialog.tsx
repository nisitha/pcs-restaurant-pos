'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-md text-center rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="w-16 h-16 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-black text-center text-[#1A1D1F]">
            Order Sent to Kitchen!
          </DialogTitle>
          <DialogDescription className="text-xs text-[#7C828D]">
            Order has been broadcast to active kitchen stations and KDS displays.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]">
            <span className="text-xs text-[#7C828D] block mb-0.5">Order Number</span>
            <span className="text-2xl font-black text-[#119C49] font-mono tracking-tight block">
              {orderNumber}
            </span>
            <span className="text-sm font-bold text-[#1A1D1F] block mt-1">
              Total: {formatLKR(totalAmount)}
            </span>
          </div>

          {/* Kitchen Station Routing Feedback */}
          <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF] text-left">
            <span className="text-xs font-bold text-[#1A1D1F] flex items-center gap-1.5 mb-2">
              <ChefHat className="w-4 h-4 text-[#119C49]" /> Auto-Routed to Kitchen Stations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {stationsRouted.length > 0 ? (
                stationsRouted.map((station, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#D1F0DC] text-[#119C49] border border-[#119C49]/20"
                  >
                    &bull; {station}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#7C828D]">Hot Kitchen</span>
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
            className="flex-1 bg-white border border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F8F9FA] text-xs font-bold rounded-2xl h-11 gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#7C828D]" />
            <span>Print KOT / Receipt</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              onNewOrder();
              onOpenChange(false);
            }}
            className="flex-1 bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold text-xs rounded-2xl h-11 gap-1.5 shadow-sm"
          >
            <span>Next Customer</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
