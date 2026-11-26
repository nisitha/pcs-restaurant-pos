'use client';

import React, { useRef } from 'react';
import { Check, Printer, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatLKR } from '@/lib/utils/currency';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderId: string;
  totalAmount: number;
  paymentMethod: string;
  paymentTime: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  serviceCharge?: number;
  tableNumber?: string | null;
  onNewOrder: () => void;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  orderNumber,
  orderId,
  totalAmount,
  paymentMethod,
  paymentTime,
  items = [],
  subtotal = 0,
  serviceCharge = 0,
  tableNumber,
  onNewOrder,
}: PaymentSuccessModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrintReceipt = () => {
    window.print();
  };

  const formattedMethod =
    paymentMethod === 'credit_card'
      ? 'Credit/Debit Card'
      : paymentMethod === 'qr_payment'
      ? 'QR Code'
      : 'Cash';

  return (
    <>
      {/* Screen Modal (Hidden during printing) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden animate-in fade-in zoom-in-95">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#EBECEF] text-center relative flex flex-col items-center">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F6F7F9] text-[#7C828D] hover:text-[#1A1D1F] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Halo Green Checkmark */}
          <div className="w-20 h-20 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-4 mt-2 shadow-inner">
            <div className="w-14 h-14 rounded-full bg-[#119C49] text-white flex items-center justify-center shadow-lg shadow-[#119C49]/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-extrabold text-[#1A1D1F] tracking-tight">Payment Success!</h2>
          <p className="text-2xl font-black text-[#119C49] mt-1 font-mono tracking-tight">
            {formatLKR(totalAmount)}
          </p>

          {/* Key-Value Details */}
          <div className="w-full mt-6 py-4 border-y border-[#F4F5F7] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Order ID</span>
              <span className="font-bold text-[#1A1D1F] font-mono">{orderNumber}</span>
            </div>
            {tableNumber && (
              <div className="flex items-center justify-between">
                <span className="text-[#7C828D]">Table</span>
                <span className="font-bold text-[#1A1D1F]">Table {tableNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Payment Method</span>
              <span className="font-bold text-[#1A1D1F]">{formattedMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Payment Time</span>
              <span className="font-bold text-[#1A1D1F] font-mono">{paymentTime}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full mt-6 space-y-2.5">
            <Button
              type="button"
              onClick={onNewOrder}
              className="w-full h-12 bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#119C49]/20 transition"
            >
              New Order
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePrintReceipt}
              className="w-full h-12 bg-white hover:bg-[#F6F7F9] border border-[#EBECEF] text-[#119C49] font-bold text-sm rounded-2xl gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Thermal Receipt (Hidden on screen, Visible only during print) */}
      <div className="hidden print:block fixed inset-0 bg-white p-4 text-black text-xs font-mono leading-tight">
        <div ref={receiptRef} className="max-w-[80mm] mx-auto text-center space-y-2">
          <p className="text-base font-bold">PCS RESTAURANT POS</p>
          <p className="text-[10px]">Colombo Main Branch &bull; Sri Lanka</p>
          <p className="text-[10px]">Tel: +94 11 234 5678</p>
          <div className="border-b border-black border-dashed my-2" />
          
          <div className="text-left text-[11px] space-y-0.5">
            <p>Order: <b>{orderNumber}</b></p>
            {tableNumber && <p>Table: <b>Table {tableNumber}</b></p>}
            <p>Time: {paymentTime}</p>
            <p>Payment: {formattedMethod}</p>
          </div>

          <div className="border-b border-black border-dashed my-2" />

          {/* Items */}
          <div className="text-left text-[11px] space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>{formatLKR(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-black border-dashed my-2" />

          <div className="text-right text-[11px] space-y-0.5">
            {subtotal > 0 && (
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatLKR(subtotal)}</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between">
                <span>Service Charge (10%):</span>
                <span>{formatLKR(serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-black">
              <span>TOTAL:</span>
              <span>{formatLKR(totalAmount)}</span>
            </div>
          </div>

          <div className="border-b border-black border-dashed my-3" />
          <p className="text-[10px] text-center font-bold">THANK YOU FOR DINING WITH US!</p>
          <p className="text-[9px] text-center">Software by PCS POS Systems</p>
        </div>
      </div>
    </>
  );
}
