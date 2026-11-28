'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  UtensilsCrossed,
  QrCode,
  CheckCircle2,
  CreditCard,
  Wallet,
  MessageCircle,
  Sparkles,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatLKR } from '@/lib/utils/currency';
import { DishImage } from '@/components/ui/dish-image';
import {
  CFD_CHANNEL_NAME,
  CFD_STORAGE_KEY,
  CfdLivePayload,
  readCfdState,
} from '@/lib/pos/cfd-sync';
import { useBranchStore } from '@/stores/branch-store';

export default function CustomerFacingDisplayPage() {
  const { activeBranch } = useBranchStore();

  const [mounted, setMounted] = useState<boolean>(false);
  const [liveState, setLiveState] = useState<CfdLivePayload | null>(null);
  const [lankaQrDataUrl, setLankaQrDataUrl] = useState<string>('');
  const [showThankYou, setShowThankYou] = useState<boolean>(false);

  // Sync via BroadcastChannel + localStorage storage event (instant dual-monitor sync)
  useEffect(() => {
    setMounted(true);
    const initial = readCfdState();
    if (initial) {
      setLiveState(initial);
      if (initial.paymentSuccess) {
        setShowThankYou(true);
      }
    }

    const handlePayload = (payload: CfdLivePayload) => {
      setLiveState(payload);
      if (payload.paymentSuccess) {
        setShowThankYou(true);
      } else if (payload.items.length > 0) {
        setShowThankYou(false);
      }
    };

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(CFD_CHANNEL_NAME);
      ch.onmessage = (event) => {
        if (event.data) handlePayload(event.data as CfdLivePayload);
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CFD_STORAGE_KEY && e.newValue) {
        try {
          handlePayload(JSON.parse(e.newValue) as CfdLivePayload);
        } catch {
          // ignore parse error
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (ch) ch.close();
    };
  }, []);

  // Auto-clear Thank You screen after 8 seconds back to idle ready state
  useEffect(() => {
    if (!showThankYou) return;
    const t = setTimeout(() => {
      setShowThankYou(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [showThankYou]);

  // Generate dynamic LankaQR preview code based on live total
  const generateQr = useCallback(async (amount: number, branchName: string) => {
    try {
      const qrContent = `LANKAQR://PCSBILL?merchant=${encodeURIComponent(branchName)}&currency=LKR&amount=${amount.toFixed(2)}`;
      const url = await QRCode.toDataURL(qrContent, {
        width: 260,
        margin: 1,
        color: {
          dark: '#072619',
          light: '#FFFFFF',
        },
      });
      setLankaQrDataUrl(url);
    } catch {
      // ignore qr generation error
    }
  }, []);

  const totalAmount = mounted ? (liveState?.total || 0) : 0;
  const branchName = mounted ? (liveState?.branchName || activeBranch?.name || 'Colombo Main') : 'Colombo Main';

  useEffect(() => {
    generateQr(totalAmount, branchName);
  }, [totalAmount, branchName, generateQr]);

  const items = liveState?.items || [];
  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen w-screen bg-[#f4fbf7] text-[#072619] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 bg-white border-b border-[#E5ECE8] flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#072619] text-[#a3e04f] flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-[#072619] tracking-tight">
              PCS Bill <span className="text-[#0f8a5f]">Customer Display</span>
            </h1>
            <p className="text-xs text-[#4f675a] font-medium">
              {branchName} &bull; Live Counter Screen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {liveState?.tableNumber && (
            <span className="px-3.5 py-1.5 rounded-full bg-[#cdeeb0] text-[#072619] text-xs font-black">
              Table {liveState.tableNumber}
            </span>
          )}
          {liveState?.customerName && (
            <span className="px-3.5 py-1.5 rounded-full bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-bold text-[#072619]">
              Welcome, {liveState.customerName}
            </span>
          )}
          <Link
            href="/pos"
            className="h-9 px-3 rounded-xl bg-[#f4fbf7] border border-[#E5ECE8] text-[#4f675a] hover:text-[#072619] text-xs font-bold flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>POS</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {showThankYou && liveState?.paymentSuccess ? (
          <motion.main
            key="thank-you"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#072619] text-white"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="w-28 h-28 rounded-full bg-[#0f8a5f] text-[#a3e04f] flex items-center justify-center mb-6 shadow-2xl border-4 border-[#a3e04f]/40"
            >
              <CheckCircle2 className="w-14 h-14" />
            </motion.div>

            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white">
              Thank You!
            </h2>
            <p className="text-lg text-[#cdeeb0] mt-2 font-medium">
              Your payment of{' '}
              <span className="font-mono font-black text-[#a3e04f]">
                {formatLKR(liveState.paymentSuccess.totalAmount)}
              </span>{' '}
              is confirmed.
            </p>

            <div className="mt-8 px-8 py-5 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-1">
              <p className="text-xs uppercase tracking-widest text-white/60 font-bold">Order Reference</p>
              <p className="font-display text-3xl font-black font-mono text-[#a3e04f]">
                #{liveState.paymentSuccess.orderNumber}
              </p>
              <p className="text-xs text-white/70">
                {liveState.paymentSuccess.paymentTime} &bull; Paid via {liveState.paymentSuccess.paymentMethod.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="active-bill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-hidden"
          >
            {/* LEFT: Live Itemized Bill (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E5ECE8] shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5ECE8] flex items-center justify-between bg-[#f4fbf7]/50">
                <h2 className="font-display text-xl font-extrabold text-[#072619] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#0f8a5f]" />
                  <span>Your Order Summary</span>
                </h2>
                <span className="px-3 py-1 rounded-full bg-[#cdeeb0] text-[#072619] text-xs font-black font-mono">
                  {items.reduce((s, i) => s + i.quantity, 0)} Items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-none">
                {!hasItems ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 text-[#4f675a]">
                    <div className="w-20 h-20 rounded-3xl bg-[#cdeeb0]/50 text-[#0f8a5f] flex items-center justify-center mb-4">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <h3 className="font-display text-2xl font-extrabold text-[#072619]">
                      Welcome to {branchName}
                    </h3>
                    <p className="text-sm text-[#4f675a] mt-1 max-w-md">
                      Your itemized order, discounts, and LankaQR payment prompt will appear here automatically as the cashier scans your dishes.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.cart_item_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white border border-[#E5ECE8]">
                            <DishImage
                              src={item.image_url}
                              alt={item.item_name}
                              category={item.item_name}
                              aspectRatio="square"
                              className="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-extrabold text-[#072619] truncate">
                              {item.item_name}
                            </h4>
                            {item.variant_name && (
                              <p className="text-xs text-[#0f8a5f] font-semibold">{item.variant_name}</p>
                            )}
                            <p className="text-xs text-[#4f675a] font-mono">
                              {formatLKR(item.unit_price)} &times; {item.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-display text-lg font-black text-[#072619] font-mono">
                            {formatLKR(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Bottom Financials */}
              <div className="p-6 border-t border-[#E5ECE8] bg-[#f4fbf7]/70 space-y-2 text-sm">
                <div className="flex justify-between text-[#4f675a]">
                  <span>Sub Total</span>
                  <span className="font-bold font-mono text-[#072619]">{formatLKR(liveState?.subtotal || 0)}</span>
                </div>
                {(liveState?.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-[#0f8a5f] font-bold">
                    <span>Promo / Courtesy Discount</span>
                    <span className="font-mono">-{formatLKR(liveState?.discountAmount || 0)}</span>
                  </div>
                )}
                {(liveState?.loyaltyDiscount || 0) > 0 && (
                  <div className="flex justify-between text-[#0f8a5f] font-bold">
                    <span>Loyalty Points Redeemed</span>
                    <span className="font-mono">-{formatLKR(liveState?.loyaltyDiscount || 0)}</span>
                  </div>
                )}
                {(liveState?.serviceCharge || 0) > 0 && (
                  <div className="flex justify-between text-[#4f675a]">
                    <span>Service Charge (10%)</span>
                    <span className="font-bold font-mono text-[#072619]">{formatLKR(liveState?.serviceCharge || 0)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#E5ECE8] flex items-center justify-between">
                  <span className="font-display text-xl font-black text-[#072619]">Total Payable</span>
                  <span className="font-display text-3xl font-black font-mono text-[#0f8a5f]">
                    {formatLKR(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: LankaQR / Scan to Pay Card (5 cols) */}
            <div className="lg:col-span-5 bg-[#072619] text-white rounded-3xl p-7 flex flex-col items-center justify-between text-center shadow-2xl border border-[#0f8a5f]/30">
              <div className="w-full">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0f8a5f]/30 border border-[#a3e04f]/30 text-[#a3e04f] text-xs font-extrabold uppercase tracking-wider mb-3">
                  <QrCode className="w-4 h-4" />
                  <span>LankaQR Instant Pay</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
                  Scan to Pay
                </h2>
                <p className="text-xs text-[#cdeeb0]/80 mt-1">
                  Supported by all Sri Lankan Banking &amp; FinTech Apps
                </p>
              </div>

              <div className="my-6 p-5 bg-white rounded-3xl shadow-2xl flex flex-col items-center">
                {lankaQrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lankaQrDataUrl}
                    alt="LankaQR Scan to Pay"
                    className="w-52 h-52 sm:w-56 sm:h-56 rounded-xl"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-[#4f675a]">
                    Generating LankaQR...
                  </div>
                )}
                <span className="mt-3 text-sm font-black font-mono text-[#072619]">
                  {totalAmount > 0 ? formatLKR(totalAmount) : 'Ready for Billing'}
                </span>
              </div>

              <div className="w-full space-y-3">
                <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                    <Wallet className="w-4 h-4 text-[#a3e04f]" />
                    <span>Cash</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                    <CreditCard className="w-4 h-4 text-[#a3e04f]" />
                    <span>Visa / Master</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-[#a3e04f]" />
                    <span>WA E-Bill</span>
                  </div>
                </div>
                <p className="text-[11px] text-white/50">
                  Powered by Pixel Craft Studios &bull; pcsbill.com
                </p>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
