'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  Sparkles,
  ArrowRight,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DishImage } from '@/components/ui/dish-image';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  category_id: string;
  is_available: boolean;
  variants?: Array<{ id: string; variant_name: string; price_override: number }>;
  modifier_groups?: Array<{
    id: string;
    title: string;
    min_selection: number;
    max_selection: number;
    modifiers: Array<{ id: string; name: string; price_addition: number }>;
  }>;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

interface CartItem {
  cart_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  variant_id?: string;
  variant_name?: string;
  modifiers?: Array<{ modifier_id: string; modifier_name: string; unit_price: number }>;
  notes?: string;
}

export default function TableSelfOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);

  const [table, setTable] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('');
  const [guestNotes, setGuestNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Selected item for customization
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState<string>('');

  // 1. Fetch Table & Active Order
  const fetchTableData = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/table/${tableId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTable(data.table);
          if (data.activeOrder) {
            setActiveOrder(data.activeOrder);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch table info:', err);
    }
  }, [tableId]);

  // 2. Fetch Menu
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.items) setMenuItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchTableData(), fetchMenu()]).finally(() => setIsLoading(false));

    // Polling for live status update if order exists
    const interval = setInterval(() => {
      fetchTableData();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchTableData, fetchMenu]);

  // Handle adding item to cart
  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    if (item.variants && item.variants.length > 0) {
      setSelectedVariantId(item.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
    setSelectedModifierIds([]);
    setCustomNotes('');
  };

  const handleAddToCart = (item: MenuItem) => {
    // If has variants or modifiers, open customization modal
    if ((item.variants && item.variants.length > 0) || (item.modifier_groups && item.modifier_groups.length > 0)) {
      handleOpenCustomize(item);
      return;
    }

    // Direct add
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id && !i.variant_id);
      if (existing) {
        return prev.map((i) =>
          i.cart_id === existing.cart_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cart_id: `${item.id}-${Date.now()}`,
          menu_item_id: item.id,
          name: item.name,
          unit_price: Number(item.base_price),
          quantity: 1,
          image_url: item.image_url,
        },
      ];
    });
  };

  const handleConfirmCustomize = () => {
    if (!customizingItem) return;

    let price = Number(customizingItem.base_price);
    let vName: string | undefined;

    if (selectedVariantId && customizingItem.variants) {
      const variant = customizingItem.variants.find((v) => v.id === selectedVariantId);
      if (variant) {
        price = Number(variant.price_override);
        vName = variant.variant_name;
      }
    }

    const appliedMods: Array<{ modifier_id: string; modifier_name: string; unit_price: number }> = [];
    if (customizingItem.modifier_groups) {
      for (const group of customizingItem.modifier_groups) {
        for (const mod of group.modifiers) {
          if (selectedModifierIds.includes(mod.id)) {
            appliedMods.push({
              modifier_id: mod.id,
              modifier_name: mod.name,
              unit_price: Number(mod.price_addition),
            });
            price += Number(mod.price_addition);
          }
        }
      }
    }

    setCart((prev) => [
      ...prev,
      {
        cart_id: `${customizingItem.id}-${Date.now()}`,
        menu_item_id: customizingItem.id,
        name: customizingItem.name,
        unit_price: price,
        quantity: 1,
        image_url: customizingItem.image_url,
        variant_id: selectedVariantId || undefined,
        variant_name: vName,
        modifiers: appliedMods,
        notes: customNotes.trim() || undefined,
      },
    ]);

    setCustomizingItem(null);
  };

  const updateCartQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cart_id === cartId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  // Calculations
  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const serviceCharge = Math.round(subtotal * 0.1); // 10%
  const total = subtotal + serviceCharge;

  // Submit Order
  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !table) return;

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((i) => ({
        menu_item_id: i.menu_item_id,
        variant_id: i.variant_id || null,
        item_name: i.variant_name ? `${i.name} (${i.variant_name})` : i.name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        notes: i.notes || null,
        modifiers: (i.modifiers || []).map((m) => ({
          modifier_id: m.modifier_id,
          modifier_name: m.modifier_name,
          unit_price: m.unit_price,
        })),
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: table.branch_id || '00000000-0000-0000-0000-000000000001',
          tableId: table.id,
          orderType: 'dine_in',
          orderSource: 'table_qr',
          customerName: guestName.trim() || `Guest at Table ${table.table_number}`,
          notes: guestNotes.trim() || null,
          items: itemsPayload,
          idempotencyKey: `QR-${table.id}-${Date.now()}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCart([]);
          setIsCartOpen(false);
          setOrderSuccess(data);
          fetchTableData();
        }
      }
    } catch (err) {
      console.error('Failed to submit table QR order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Items
  const filteredItems = menuItems.filter((item) => {
    if (!item.is_available) return false;
    const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#1A1D1F] font-sans pb-32">
      {/* Top Banner Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EBECEF] px-4 py-3 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-black shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-extrabold text-[#072619] leading-tight">
                PCS Bill Self-Order
              </h1>
              <p className="text-xs font-semibold text-[#0f8a5f] flex items-center gap-1">
                <span>Table {table?.table_number || '...'}</span>
                <span className="text-[#A0A4AB]">•</span>
                <span className="text-[#7C828D]">{table?.section || 'Dine-In'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#D1F0DC] text-[#119C49] text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#119C49] animate-pulse"></span>
              <span>QR Order</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Live Order Tracker (If active order exists) */}
        {(activeOrder || orderSuccess) && (
          <div className="bg-white rounded-3xl p-5 border-2 border-[#119C49]/30 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBECEF]">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#119C49]" />
                <h3 className="text-base font-extrabold text-[#1A1D1F]">
                  Order #{activeOrder?.order_number || orderSuccess?.orderNumber}
                </h3>
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#D1F0DC] text-[#119C49] uppercase">
                {activeOrder?.kds_status || 'In Kitchen'}
              </span>
            </div>

            {/* Step Timeline */}
            <div className="py-4 grid grid-cols-4 gap-2 text-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#119C49] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#119C49] mt-1.5">Placed</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    ['in_preparation', 'partially_ready', 'ready', 'served'].includes(activeOrder?.kds_status)
                      ? 'bg-[#119C49] text-white'
                      : 'bg-[#F59E0B] text-white animate-pulse'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#1A1D1F] mt-1.5">Cooking</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    ['ready', 'served'].includes(activeOrder?.kds_status)
                      ? 'bg-[#119C49] text-white'
                      : 'bg-[#EBECEF] text-[#7C828D]'
                  }`}
                >
                  <BellRing className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#7C828D] mt-1.5">Ready</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    activeOrder?.kds_status === 'served'
                      ? 'bg-[#119C49] text-white'
                      : 'bg-[#EBECEF] text-[#7C828D]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#7C828D] mt-1.5">Served</span>
              </div>
            </div>

            <p className="text-xs text-[#7C828D] text-center bg-[#F6F7F9] py-2 rounded-xl">
              Kitchen is preparing your dishes. You can order more items anytime below!
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7C828D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search our delicious dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-[#EBECEF] text-sm text-[#1A1D1F] placeholder:text-[#7C828D] focus:outline-none focus:ring-2 focus:ring-[#119C49]"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#119C49] text-white shadow-xs'
                : 'bg-white text-[#7C828D] border border-[#EBECEF]'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#119C49] text-white shadow-xs'
                  : 'bg-white text-[#7C828D] border border-[#EBECEF]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.025 } },
          }}
          className="space-y-3 pt-1"
        >
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
              }}
              className="bg-white rounded-3xl p-3.5 border border-[#EBECEF] flex items-center justify-between gap-3.5 shadow-2xs hover:shadow-sm transition-all"
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-[#F6F7F9] shadow-2xs">
                <DishImage
                  src={item.image_url}
                  alt={item.name}
                  category={categories.find((c) => c.id === item.category_id)?.name || item.name}
                  aspectRatio="square"
                  className="w-full h-full"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-[#1A1D1F] truncate">
                  {item.name}
                </h4>
                {item.description && (
                  <p className="text-xs text-[#7C828D] line-clamp-1 mt-0.5">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-black text-[#119C49]">
                    Rs. {Number(item.base_price).toLocaleString()}
                  </span>
                  {(item.variants && item.variants.length > 0) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F6F7F9] text-[#7C828D]">
                      Customizable
                    </span>
                  )}
                </div>
              </div>

              {/* Add Button */}
              <div className="shrink-0">
                <motion.div whileTap={{ scale: 0.92 }}>
                  <Button
                    onClick={() => handleAddToCart(item)}
                    className="h-9 px-3.5 rounded-2xl bg-[#D1F0DC] hover:bg-[#119C49] text-[#119C49] hover:text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#EBECEF]">
              <Utensils className="w-10 h-10 text-[#7C828D] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-[#1A1D1F]">No items found</p>
              <p className="text-xs text-[#7C828D]">Try searching for something else</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-[#119C49] text-white rounded-3xl p-4 shadow-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items in your tray
                </p>
                <p className="text-base font-black text-white">
                  Rs. {total.toLocaleString()}
                </p>
              </div>
            </div>

            <Button
              className="h-10 px-5 rounded-2xl bg-white text-[#119C49] font-black text-sm flex items-center gap-1 shadow-xs"
            >
              <span>View Tray</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cart & Review Modal */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#EBECEF]">
            <DialogTitle className="text-xl font-black text-[#1A1D1F] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#119C49]" />
              <span>Review Your Table Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7C828D]">
              Table {table?.table_number} • Direct routing to kitchen
            </DialogDescription>
          </DialogHeader>

          {/* Cart Items */}
          <div className="py-4 space-y-3">
            {cart.map((item) => (
              <div
                key={item.cart_id}
                className="bg-[#F6F7F9] p-3 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white border border-[#EBECEF]">
                  <DishImage
                    src={item.image_url}
                    alt={item.name}
                    category={item.name}
                    aspectRatio="square"
                    className="w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-extrabold text-[#1A1D1F] truncate">
                    {item.name}
                    {item.variant_name && ` (${item.variant_name})`}
                  </h5>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-[11px] text-[#7C828D]">
                      {item.modifiers.map((m) => m.modifier_name).join(', ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-[#F59E0B] italic">
                      Note: {item.notes}
                    </p>
                  )}
                  <p className="text-xs font-bold text-[#119C49] mt-0.5">
                    Rs. {(item.unit_price * item.quantity).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-[#EBECEF]">
                  <button
                    onClick={() => updateCartQty(item.cart_id, -1)}
                    className="w-6 h-6 flex items-center justify-center text-[#7C828D] hover:text-[#1A1D1F]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black min-w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQty(item.cart_id, 1)}
                    className="w-6 h-6 flex items-center justify-center text-[#119C49]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Guest Inputs */}
          <div className="space-y-3 pt-2 border-t border-[#EBECEF]">
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Kasun Perera"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Kitchen Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, serve drinks first"
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49] focus:outline-none"
              />
            </div>
          </div>

          {/* Bill Summary */}
          <div className="pt-3 border-t border-[#EBECEF] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#7C828D]">
              <span>Subtotal</span>
              <span className="font-bold text-[#1A1D1F]">Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[#7C828D]">
              <span>Service Charge (10%)</span>
              <span className="font-bold text-[#1A1D1F]">Rs. {serviceCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-[#1A1D1F] pt-1 border-t border-[#EBECEF]">
              <span>Total Payable</span>
              <span className="text-[#119C49]">Rs. {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-12 mt-4 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <span>Sending Order...</span>
            ) : (
              <>
                <ChefHat className="w-5 h-5" />
                <span>Send Order to Kitchen</span>
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Item Customization Modal */}
      <Dialog open={!!customizingItem} onOpenChange={() => setCustomizingItem(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#EBECEF]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-[#F6F7F9] border border-[#EBECEF]">
                <DishImage
                  src={customizingItem?.image_url}
                  alt={customizingItem?.name || 'Dish'}
                  category={customizingItem?.name}
                  aspectRatio="square"
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-black text-[#1A1D1F] truncate">
                  Customize {customizingItem?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#7C828D]">
                  Select portion size and preferences for this item.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Variants */}
          {customizingItem?.variants && customizingItem.variants.length > 0 && (
            <div className="py-2 space-y-2">
              <label className="text-xs font-bold text-[#1A1D1F] block">Select Size / Portion</label>
              <div className="grid grid-cols-2 gap-2">
                {customizingItem.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedVariantId === v.id
                        ? 'border-[#119C49] bg-[#D1F0DC]/30 text-[#119C49]'
                        : 'border-[#EBECEF] bg-white text-[#1A1D1F]'
                    }`}
                  >
                    <p className="text-xs font-bold">{v.variant_name}</p>
                    <p className="text-xs font-black mt-0.5">Rs. {Number(v.price_override).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifier Groups */}
          {customizingItem?.modifier_groups?.map((group) => (
            <div key={group.id} className="py-2 space-y-2">
              <label className="text-xs font-bold text-[#1A1D1F] block">
                {group.title}
              </label>
              <div className="space-y-1.5">
                {group.modifiers.map((mod) => {
                  const isChecked = selectedModifierIds.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        setSelectedModifierIds((prev) =>
                          isChecked ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]
                        );
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        isChecked
                          ? 'border-[#119C49] bg-[#D1F0DC]/30 text-[#119C49] font-bold'
                          : 'border-[#EBECEF] bg-white text-[#1A1D1F]'
                      }`}
                    >
                      <span>{mod.name}</span>
                      <span>+Rs. {Number(mod.price_addition).toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Notes */}
          <div className="py-2">
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
              Item Special Request
            </label>
            <input
              type="text"
              placeholder="e.g. Extra sauce, no onions"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#119C49] focus:outline-none"
            />
          </div>

          <Button
            onClick={handleConfirmCustomize}
            className="w-full h-11 mt-3 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold text-xs"
          >
            Add to Tray
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
