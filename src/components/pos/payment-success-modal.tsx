'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Printer, X, SlidersHorizontal } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const computedSubtotal = subtotal > 0 ? subtotal : totalAmount - serviceCharge;

  return (
    <>
      {/* Screen Modal (Hidden during printing via print:hidden) */}
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
          <div className="w-20 h-20 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-3 mt-1 shadow-inner">
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
          <div className="w-full mt-4 py-3 border-y border-[#F4F5F7] space-y-2 text-xs">
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

          {/* Paper Width Selector Pill */}
          <div className="w-full mt-4">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold text-[#7C828D] flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-[#119C49]" /> Paper Width:
              </span>
              <span className="text-[11px] font-semibold text-[#119C49]">
                {paperWidth === '80mm' ? '80mm (Standard POS)' : '58mm (Mini Portable)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  paperWidth === '80mm'
                    ? 'bg-[#119C49] text-white shadow-sm'
                    : 'text-[#7C828D] hover:text-[#1A1D1F]'
                }`}
              >
                <span>80mm Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  paperWidth === '58mm'
                    ? 'bg-[#119C49] text-white shadow-sm'
                    : 'text-[#7C828D] hover:text-[#1A1D1F]'
                }`}
              >
                <span>58mm Compact</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-5 space-y-2.5">
            <Button
              type="button"
              onClick={onNewOrder}
              className="w-full h-11 bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#119C49]/20 transition"
            >
              New Order
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePrintReceipt}
              className="w-full h-11 bg-white hover:bg-[#F6F7F9] border border-[#EBECEF] text-[#119C49] font-bold text-sm rounded-2xl gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt ({paperWidth})</span>
            </Button>
          </div>
        </div>
      </div>

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
                PCS RESTAURANT POS
              </div>
              <div style={{ fontSize: paperWidth === '80mm' ? '11px' : '9px' }}>
                Main Branch - Colombo
              </div>
              <div style={{ fontSize: paperWidth === '80mm' ? '10px' : '9px' }}>
                123 Galle Road, Colombo 03, Sri Lanka
              </div>
              <div style={{ fontSize: paperWidth === '80mm' ? '10px' : '9px' }}>
                Tel: +94 11 234 5678
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
                Software by PCS POS Systems
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
