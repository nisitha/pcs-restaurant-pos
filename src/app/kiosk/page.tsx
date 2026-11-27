'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  ShoppingBag,
  Utensils,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  CheckCircle2,
  Printer,
  ArrowLeft,
  Sparkles,
  Leaf,
  Beef,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DishImage } from '@/components/ui/dish-image';
import { ItemCustomizerModal } from '@/components/pos/item-customizer-modal';
import { useMenuStore } from '@/stores/menu-store';
import { useBranchStore } from '@/stores/branch-store';
import { MenuItem } from '@/types/menu.types';
import { CartItem } from '@/types/pos.types';
import { formatLKR } from '@/lib/utils/currency';

export default function SelfOrderingKioskPage() {
  const { categories, items, fetchMenu } = useMenuStore();
  const { activeBranchId, activeBranch } = useBranchStore();

  const [diningMode, setDiningMode] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('');
  const [guestNotes, setGuestNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Customizer Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  // Token Success Screen
  const [submittedToken, setSubmittedToken] = useState<{
    orderNumber: string;
    token: string;
    totalAmount: number;
    mode: 'dine_in' | 'takeaway';
  } | null>(null);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const availableItems = items.filter((item) => {
    if (!item.is_available) return false;
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
    return true;
  });

  const handleTapItem = (item: MenuItem) => {
    const hasVariants = item.variants && item.variants.length > 0;
    const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0;
    if (hasVariants || hasModifiers) {
      setCustomizingItem(item);
      setIsCustomizerOpen(true);
      return;
    }
    addToKioskCart({
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: Number(item.base_price),
      quantity: 1,
      station_id: item.default_station_id,
      modifiers: [],
      image_url: item.image_url,
    });
  };

  const addToKioskCart = (itemData: Omit<CartItem, 'cart_item_id'>) => {
    setCart((prev) => {
      const modsKey = (itemData.modifiers || []).map((m) => m.modifier_id).sort().join(',');
      const idx = prev.findIndex((i) => {
        const iMods = (i.modifiers || []).map((m) => m.modifier_id).sort().join(',');
        return (
          i.menu_item_id === itemData.menu_item_id &&
          i.variant_id === itemData.variant_id &&
          iMods === modsKey &&
          (i.notes || '') === (itemData.notes || '')
        );
      });
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + (itemData.quantity || 1) };
        return copy;
      }
      return [...prev, { ...itemData, cart_item_id: crypto.randomUUID(), quantity: itemData.quantity || 1 }];
    });
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cart_item_id === cartItemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const serviceCharge = diningMode === 'dine_in' ? Number((subtotal * 0.1).toFixed(2)) : 0;
  const total = subtotal + serviceCharge;

  const handleSubmitKioskOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: activeBranchId || '00000000-0000-0000-0000-000000000001',
          orderType: diningMode,
          orderSource: 'kiosk',
          customerName: guestName.trim() || 'Kiosk Guest',
          notes: guestNotes.trim() || null,
          idempotencyKey: `KIOSK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          items: cart.map((i) => ({
            menu_item_id: i.menu_item_id,
            variant_id: i.variant_id || undefined,
            item_name: i.item_name,
            unit_price: i.unit_price,
            quantity: i.quantity,
            station_id: i.station_id || undefined,
            notes: i.notes || undefined,
            modifiers: i.modifiers || [],
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const ordNum: string = data.orderNumber || `ORD-${Date.now().toString().slice(-4)}`;
        const parts = ordNum.split('-');
        const token = parts[parts.length - 1] || ordNum;
        setSubmittedToken({
          orderNumber: ordNum,
          token,
          totalAmount: Number(data.totalAmount || total),
          mode: diningMode,
        });
        setCart([]);
        setIsTrayOpen(false);
        setGuestName('');
        setGuestNotes('');
      }
    } catch (err) {
      console.error('Kiosk submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Token Success Screen
  if (submittedToken) {
    return (
      <div className="min-h-screen w-screen bg-[#072619] text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white text-[#072619] rounded-3xl p-8 shadow-2xl border-4 border-[#a3e04f]"
        >
          <div className="w-20 h-20 rounded-full bg-[#cdeeb0] text-[#0f8a5f] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-11 h-11" />
          </div>

          <span className="px-3 py-1 rounded-full bg-[#072619] text-[#a3e04f] text-xs font-black uppercase tracking-wider">
            {submittedToken.mode === 'dine_in' ? 'Eat In Order' : 'Take Away Order'}
          </span>

          <h1 className="font-display text-2xl font-black text-[#072619] mt-3">
            Order Sent to Kitchen!
          </h1>
          <p className="text-xs text-[#4f675a] mt-1">
            Please keep your token number and pay at the counter or wait for the Order Ready Board.
          </p>

          <div className="my-6 p-6 rounded-3xl bg-[#f4fbf7] border-2 border-dashed border-[#0f8a5f]/40">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#4f675a] block">
              Your Token Number
            </span>
            <span className="font-display text-6xl font-black text-[#0f8a5f] font-mono tracking-tight block mt-1">
              #{submittedToken.token}
            </span>
            <span className="text-xs font-mono text-[#4f675a] block mt-2">
              Ref: {submittedToken.orderNumber} &bull; {formatLKR(submittedToken.totalAmount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="h-12 rounded-2xl border-[#E5ECE8] text-[#072619] font-bold text-sm gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#0f8a5f]" />
              <span>Print Token</span>
            </Button>
            <Button
              type="button"
              onClick={() => setSubmittedToken(null)}
              className="h-12 rounded-2xl bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-extrabold text-sm cursor-pointer"
            >
              New Order
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[#f4fbf7] text-[#072619] flex flex-col pb-28">
      {/* Kiosk Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5ECE8] px-5 sm:px-8 py-4 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#072619] text-[#a3e04f] flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-[#072619] tracking-tight leading-none">
                PCS Bill <span className="text-[#0f8a5f]">Self-Order Kiosk</span>
              </h1>
              <p className="text-xs text-[#4f675a] font-medium mt-1">
                {activeBranch?.name || 'Colombo Main'} &bull; Tap dishes below to start
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Prominent Eat In / Take Away Switcher */}
            <div className="bg-[#f4fbf7] p-1.5 rounded-2xl border border-[#E5ECE8] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDiningMode('dine_in')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer ${
                  diningMode === 'dine_in'
                    ? 'bg-[#072619] text-[#a3e04f] shadow-sm'
                    : 'text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Eat In</span>
              </button>
              <button
                type="button"
                onClick={() => setDiningMode('takeaway')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer ${
                  diningMode === 'takeaway'
                    ? 'bg-[#072619] text-[#a3e04f] shadow-sm'
                    : 'text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Take Away</span>
              </button>
            </div>

            <Link
              href="/pos"
              className="hidden sm:flex h-10 px-3 rounded-xl bg-[#f4fbf7] border border-[#E5ECE8] text-[#4f675a] hover:text-[#072619] text-xs font-bold items-center gap-1"
              title="Staff POS"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>POS</span>
            </Link>
          </div>
        </div>

        {/* Category Pills */}
        <div className="max-w-6xl mx-auto mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'text-white'
                : 'bg-[#f4fbf7] border border-[#E5ECE8] text-[#4f675a] hover:text-[#072619]'
            }`}
          >
            {selectedCategory === 'all' && (
              <motion.div
                layoutId="active-kiosk-cat"
                className="absolute inset-0 bg-[#0f8a5f] rounded-full shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10">All Menu ({items.filter((i) => i.is_available).length})</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'bg-[#f4fbf7] border border-[#E5ECE8] text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-kiosk-cat"
                    className="absolute inset-0 bg-[#0f8a5f] rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Large Touch-Friendly Dish Grid */}
      <main className="max-w-6xl mx-auto w-full px-5 sm:px-8 pt-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {availableItems.map((item) => {
            const qty = cart.filter((c) => c.menu_item_id === item.id).reduce((s, c) => s + c.quantity, 0);
            const matchedCat = categories.find((c) => c.id === item.category_id)?.name;
            const isVeg =
              item.name.toLowerCase().includes('salad') ||
              item.name.toLowerCase().includes('veg') ||
              item.name.toLowerCase().includes('coffee') ||
              item.name.toLowerCase().includes('cake');

            return (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTapItem(item)}
                className={`bg-white rounded-3xl p-3.5 border-2 transition cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${
                  qty > 0 ? 'border-[#0f8a5f] ring-4 ring-[#0f8a5f]/10' : 'border-[#E5ECE8]'
                }`}
              >
                <div>
                  <div className="relative w-full rounded-2xl overflow-hidden mb-3">
                    <DishImage
                      src={item.image_url}
                      alt={item.name}
                      category={matchedCat}
                      aspectRatio="4/3"
                      className="w-full rounded-2xl"
                    />
                    {qty > 0 && (
                      <span className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-full bg-[#072619] text-[#a3e04f] font-mono text-xs font-black shadow-md">
                        {qty} in tray
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-extrabold text-[#072619] leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    {isVeg ? (
                      <span className="w-5 h-5 rounded-md border border-[#0f8a5f] flex items-center justify-center shrink-0 bg-[#f4fbf7]">
                        <Leaf className="w-3 h-3 text-[#0f8a5f]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-md border border-rose-500 flex items-center justify-center shrink-0 bg-rose-50">
                        <Beef className="w-3 h-3 text-rose-600" />
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-[#4f675a] line-clamp-2 mt-1">{item.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5ECE8] flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-black text-[#0f8a5f] font-mono">
                    {formatLKR(Number(item.base_price))}
                  </span>

                  <span className="h-10 px-4 rounded-2xl bg-[#cdeeb0] text-[#072619] font-extrabold text-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#0f8a5f]" />
                    <span>Add</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </main>

      {/* Floating Bottom Kiosk Tray Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 left-4 right-4 max-w-2xl mx-auto z-40">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => setIsTrayOpen(true)}
            className="bg-[#072619] text-white rounded-3xl p-4 shadow-2xl border-2 border-[#a3e04f] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0f8a5f] text-[#a3e04f] flex items-center justify-center font-black">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#cdeeb0]">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Items &bull;{' '}
                  {diningMode === 'dine_in' ? 'Eat In' : 'Take Away'}
                </p>
                <p className="font-display text-xl font-black font-mono text-[#a3e04f]">
                  {formatLKR(total)}
                </p>
              </div>
            </div>

            <Button className="h-12 px-6 rounded-2xl bg-[#a3e04f] hover:bg-[#8fd14f] text-[#072619] font-display font-black text-sm flex items-center gap-2 cursor-pointer">
              <Sparkles className="w-4 h-4" />
              <span>Review &amp; Order</span>
            </Button>
          </motion.div>
        </div>
      )}

      {/* Kiosk Review Tray Modal */}
      <Dialog open={isTrayOpen} onOpenChange={setIsTrayOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white border-[#E5ECE8] p-6 shadow-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#E5ECE8] pr-8">
            <DialogTitle className="font-display text-xl font-black text-[#072619] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#0f8a5f]" />
              <span>Review Your Kiosk Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4f675a]">
              {diningMode === 'dine_in' ? 'Eat In Dining (10% service charge applies)' : 'Take Away Counter Pickup'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2.5 max-h-60 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={item.cart_item_id}
                className="bg-[#f4fbf7] p-3 rounded-2xl border border-[#E5ECE8] flex items-center justify-between gap-3"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white border border-[#E5ECE8]">
                  <DishImage
                    src={item.image_url}
                    alt={item.item_name}
                    category={item.item_name}
                    aspectRatio="square"
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-[#072619] truncate">{item.item_name}</p>
                  {item.variant_name && (
                    <p className="text-[11px] text-[#0f8a5f] font-semibold">{item.variant_name}</p>
                  )}
                  <p className="text-xs font-mono font-bold text-[#4f675a]">
                    {formatLKR(item.unit_price * item.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-[#E5ECE8]">
                  <button
                    type="button"
                    onClick={() => updateQty(item.cart_item_id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-[#4f675a] hover:text-[#072619]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black font-mono min-w-5 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.cart_item_id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-[#0f8a5f]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart((p) => p.filter((x) => x.cart_item_id !== item.cart_item_id))}
                    className="w-7 h-7 flex items-center justify-center text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2 border-t border-[#E5ECE8]">
            <input
              type="text"
              placeholder="Your Name (optional — called at counter)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0f8a5f]"
            />
            <input
              type="text"
              placeholder="Special kitchen instructions (e.g. No onions, less spicy)"
              value={guestNotes}
              onChange={(e) => setGuestNotes(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0f8a5f]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5ECE8] space-y-1 text-xs">
            <div className="flex justify-between text-[#4f675a]">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-[#072619]">{formatLKR(subtotal)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-[#4f675a]">
                <span>Service Charge (10%)</span>
                <span className="font-mono font-bold text-[#072619]">{formatLKR(serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[#E5ECE8]">
              <span className="font-display text-base font-black text-[#072619]">Total Payable</span>
              <span className="font-display text-xl font-black font-mono text-[#0f8a5f]">{formatLKR(total)}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSubmitKioskOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-13 mt-3 rounded-2xl bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-display font-black text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <ChefHat className="w-5 h-5 text-[#a3e04f]" />
            <span>{isSubmitting ? 'Sending to Kitchen...' : 'Confirm & Get Token'}</span>
          </Button>
        </DialogContent>
      </Dialog>

      {/* Item Customizer Modal */}
      <ItemCustomizerModal
        isOpen={isCustomizerOpen}
        onOpenChange={setIsCustomizerOpen}
        item={customizingItem}
        onAddToCart={(configured) => {
          addToKioskCart(configured);
          setIsCustomizerOpen(false);
        }}
      />
    </div>
  );
}
