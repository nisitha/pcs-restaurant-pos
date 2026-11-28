'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Printer, X, SlidersHorizontal, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatLKR } from '@/lib/utils/currency';
import { motion, AnimatePresence } from 'framer-motion';

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
  customerPhone?: string | null;
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
  customerPhone,
  onNewOrder,
}: PaymentSuccessModalProps) {
  const [mounted, setMounted] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSendWhatsAppEBill = () => {
    const cleanPhone = (customerPhone || '+94787676576').replace(/[^0-9]/g, '');
    const itemsText = items
      .map((i) => `• ${i.quantity}x ${i.name} — ${formatLKR(i.price * i.quantity)}`)
      .join('\n');
    const text = encodeURIComponent(
      `*PCS BILL — E-Receipt*\nOrder: #${orderNumber}${tableNumber ? `\nTable: ${tableNumber}` : ''}\nTime: ${paymentTime}\n\n${itemsText}\n\n*Total Paid: ${formatLKR(totalAmount)}*\nMethod: ${formattedMethod}\n\nThank you for dining with us!\npcsbill.com • Powered by Pixel Craft Studios`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const formattedMethod =
    paymentMethod === 'credit_card'
      ? 'Credit/Debit Card'
      : paymentMethod === 'whatsapp_ebill'
      ? 'WhatsApp E-Bill (QR)'
      : paymentMethod === 'qr_payment'
      ? 'LankaQR'
      : 'Cash';

  const computedSubtotal = subtotal > 0 ? subtotal : totalAmount - serviceCharge;

  return (
    <>
      {/* Screen Modal (Hidden during printing via print:hidden) */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#EBECEF] text-center relative flex flex-col items-center"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F6F7F9] text-[#7C828D] hover:text-[#1A1D1F] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Halo Green Checkmark with Animated Path */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-[#cdeeb0] text-[#0f8a5f] flex items-center justify-center mb-3 mt-1 shadow-inner"
            >
              <div className="w-14 h-14 rounded-full bg-[#0f8a5f] text-white flex items-center justify-center shadow-lg shadow-[#0f8a5f]/30">
                <svg
                  className="w-8 h-8 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
                  />
                </svg>
              </div>
            </motion.div>

            {/* Heading */}
            <h2 className="font-display text-xl font-extrabold text-[#072619] tracking-tight">Payment Success!</h2>
            <p className="font-display text-2xl font-black text-[#0f8a5f] mt-1 font-mono tracking-tight">
              {formatLKR(totalAmount)}
            </p>

          {/* Scalloped Thermal Ticket Preview */}
          <div className="w-full mt-4 rounded-t-2xl bg-[#f4fbf7] border border-b-0 border-[#E5ECE8] p-3.5 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#4f675a]">Order ID</span>
              <span className="font-bold text-[#072619] font-mono">{orderNumber}</span>
            </div>
            {tableNumber && (
              <div className="flex items-center justify-between">
                <span className="text-[#4f675a]">Table</span>
                <span className="font-bold text-[#072619]">Table {tableNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#4f675a]">Payment Method</span>
              <span className="font-bold text-[#072619]">{formattedMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#4f675a]">Payment Time</span>
              <span className="font-bold text-[#072619] font-mono">{paymentTime}</span>
            </div>
            {items.length > 0 && (
              <div className="pt-2 border-t border-dashed border-[#c8dad0] space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                {items.slice(0, 4).map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] text-[#4f675a]">
                    <span className="truncate pr-2">{it.quantity}x {it.name}</span>
                    <span className="font-mono font-bold text-[#072619] shrink-0">{formatLKR(it.price * it.quantity)}</span>
                  </div>
                ))}
                {items.length > 4 && (
                  <p className="text-[10px] text-[#0f8a5f] font-bold">+{items.length - 4} more items on receipt</p>
                )}
              </div>
            )}
          </div>
          <div className="w-full h-2 pcs-ticket-scallop mb-1" />

          {/* Paper Width Selector Pill */}
          <div className="w-full mt-4">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold text-[#4f675a] flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-[#0f8a5f]" /> Paper Width:
              </span>
              <span className="text-[11px] font-semibold text-[#0f8a5f]">
                {paperWidth === '80mm' ? '80mm (Standard POS)' : '58mm (Mini Portable)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f4fbf7] rounded-2xl border border-[#E5ECE8]">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  paperWidth === '80mm'
                    ? 'bg-[#0f8a5f] text-white shadow-sm'
                    : 'text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                <span>80mm Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  paperWidth === '58mm'
                    ? 'bg-[#0f8a5f] text-white shadow-sm'
                    : 'text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                <span>58mm Compact</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-5 space-y-2">
            <Button
              type="button"
              onClick={onNewOrder}
              className="w-full h-11 bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#0f8a5f]/20 transition"
            >
              New Order
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReceipt}
                className="h-10 bg-white hover:bg-[#f4fbf7] border border-[#E5ECE8] text-[#072619] font-bold text-xs rounded-2xl gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-[#0f8a5f]" />
                <span>Print ({paperWidth})</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSendWhatsAppEBill}
                className="h-10 bg-[#cdeeb0]/40 hover:bg-[#cdeeb0] border border-[#0f8a5f]/25 text-[#072619] font-bold text-xs rounded-2xl gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#0f8a5f]" />
                <span>WhatsApp E-Bill</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

      {/* 
        Isolated Thermal Receipt Portal
        Directly mounted to document.body inside #thermal-print-root.
        Completely isolated from app navigation, sidebars, and overlays.
      */}
      {mounted &&
        createPortal(
          <div
            id="thermal-print-root"
            className={paperWidth === '80mm' ? 'paper-80mm' : 'paper-58mm'}
          >
            {/* Header / Brand */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: paperWidth === '80mm' ? '15px' : '12px' }}>
                PCS BILL
              </div>
              <div style={{ fontSize: paperWidth === '80mm' ? '11px' : '9px' }}>
                pcsbill.com &bull; Colombo Branch
              </div>
              <div style={{ fontSize: paperWidth === '80mm' ? '10px' : '9px' }}>
                Hotline / WhatsApp: +94 78 76 76 576
              </div>
            </div>

            {/* Top Divider */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '6px 0',
              }}
            />

            {/* Order Metadata */}
            <div style={{ fontSize: paperWidth === '80mm' ? '11px' : '9.5px', lineHeight: '1.4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ORDER:</span>
                <span style={{ fontWeight: 'bold' }}>{orderNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TABLE / TYPE:</span>
                <span>{tableNumber ? `Table ${tableNumber}` : 'Takeaway / Quick'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>DATE & TIME:</span>
                <span>{paymentTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PAYMENT:</span>
                <span>{formattedMethod}</span>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '6px 0',
              }}
            />

            {/* Itemized Table Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: paperWidth === '80mm' ? '11px' : '9.5px',
                marginBottom: '4px',
              }}
            >
              <span style={{ flex: '1', textAlign: 'left' }}>ITEM</span>
              <span style={{ width: '32px', textAlign: 'center' }}>QTY</span>
              <span style={{ width: paperWidth === '80mm' ? '80px' : '65px', textAlign: 'right' }}>
                AMOUNT
              </span>
            </div>

            {/* Itemized Table Rows */}
            <div style={{ fontSize: paperWidth === '80mm' ? '11px' : '9.5px', lineHeight: '1.4' }}>
              {items && items.length > 0 ? (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '3px',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        flex: '1',
                        textAlign: 'left',
                        wordBreak: 'break-word',
                        paddingRight: '4px',
                      }}
                    >
                      {item.name}
                    </span>
                    <span style={{ width: '32px', textAlign: 'center' }}>{item.quantity}</span>
                    <span
                      style={{
                        width: paperWidth === '80mm' ? '80px' : '65px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatLKR(item.price * item.quantity)}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Order Total Items</span>
                  <span>{formatLKR(totalAmount)}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '6px 0',
              }}
            />

            {/* Financial Summary */}
            <div style={{ fontSize: paperWidth === '80mm' ? '11px' : '9.5px', lineHeight: '1.4' }}>
              {computedSubtotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{formatLKR(computedSubtotal)}</span>
                </div>
              )}
              {serviceCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Service Charge (10%):</span>
                  <span>{formatLKR(serviceCharge)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: paperWidth === '80mm' ? '13px' : '11px',
                  borderTop: '1px solid #000000',
                  paddingTop: '4px',
                  marginTop: '4px',
                }}
              >
                <span>TOTAL AMOUNT:</span>
                <span>{formatLKR(totalAmount)}</span>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '6px 0',
              }}
            />

            {/* Tender & Status */}
            <div
              style={{
                fontSize: paperWidth === '80mm' ? '10.5px' : '9px',
                lineHeight: '1.4',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>TENDER: {formattedMethod}</span>
              <span style={{ fontWeight: 'bold' }}>STATUS: PAID</span>
            </div>

            {/* Divider */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '8px 0 6px 0',
              }}
            />

            {/* Barcode-style Order ID & Footer Greeting */}
            <div
              style={{
                textAlign: 'center',
                fontSize: paperWidth === '80mm' ? '10px' : '8.5px',
                lineHeight: '1.4',
              }}
            >
              <div style={{ letterSpacing: '2px', fontWeight: 'bold', margin: '4px 0' }}>
                * {orderNumber} *
              </div>
              <div style={{ fontWeight: 'bold', margin: '2px 0' }}>
                THANK YOU FOR DINING WITH US!
              </div>
              <div>Please visit us again</div>
              <div style={{ fontSize: paperWidth === '80mm' ? '9px' : '7.5px', color: '#333333', marginTop: '4px' }}>
                Powered by Pixel Craft Studios &bull; pcsbill.com
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
