'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Bike,
  Store,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  category_id: string;
  is_available: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
}

interface CartItem {
  cart_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export default function OnlineOrderingPage() {
  const [orderMode, setOrderMode] = useState<'delivery' | 'pickup'>('delivery');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // Customer Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeOnlineOrder, setActiveOnlineOrder] = useState<any>(null);

  // Fetch Menu
  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch('/api/menu');
        if (res.ok) {
          const data = await res.json();
          if (data.categories) setCategories(data.categories);
          if (data.items) setMenuItems(data.items);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
      }
    }
    loadMenu();
  }, []);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id);
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
        },
      ];
    });
  };

  const updateCartQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cart_id === cartId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const deliveryFee = orderMode === 'delivery' ? 250 : 0;
  const total = subtotal + deliveryFee;

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !customerName.trim() || !customerPhone.trim()) return;
    if (orderMode === 'delivery' && !deliveryAddress.trim()) return;

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((i) => ({
        menu_item_id: i.menu_item_id,
        item_name: i.name,
        unit_price: i.unit_price,
        quantity: i.quantity,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: '00000000-0000-0000-0000-000000000001',
          orderType: orderMode === 'delivery' ? 'delivery' : 'takeaway',
          orderSource: 'online_web',
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: orderMode === 'delivery' ? deliveryAddress.trim() : null,
          deliveryFee,
          notes: orderNotes.trim() || null,
          items: itemsPayload,
          idempotencyKey: `WEB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCart([]);
          setIsCheckoutOpen(false);
          setActiveOnlineOrder({
            id: data.orderId,
            orderNumber: data.orderNumber,
            totalAmount: data.totalAmount,
            mode: orderMode,
            status: 'preparing',
          });
        }
      }
    } catch (err) {
      console.error('Failed to submit online order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EBECEF] px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-black">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#1A1D1F] leading-tight">
                PCS Restaurant Online
              </h1>
              <p className="text-xs text-[#7C828D]">
                Fresh, hot meals delivered to your doorstep
              </p>
            </div>
          </div>

          {/* Delivery / Pickup Switcher */}
          <div className="flex items-center bg-[#F6F7F9] p-1 rounded-2xl border border-[#EBECEF]">
            <button
              onClick={() => setOrderMode('delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                orderMode === 'delivery'
                  ? 'bg-[#119C49] text-white shadow-xs'
                  : 'text-[#7C828D]'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
            <button
              onClick={() => setOrderMode('pickup')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                orderMode === 'pickup'
                  ? 'bg-[#119C49] text-white shadow-xs'
                  : 'text-[#7C828D]'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Pickup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Active Online Order Tracker */}
        {activeOnlineOrder && (
          <div className="bg-white rounded-3xl p-5 border-2 border-[#119C49]/30 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBECEF]">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#119C49]" />
                <h3 className="text-base font-extrabold text-[#1A1D1F]">
                  Order #{activeOnlineOrder.orderNumber}
                </h3>
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#D1F0DC] text-[#119C49] uppercase">
                {activeOnlineOrder.mode === 'delivery' ? 'Delivery Order' : 'Takeaway Pickup'}
              </span>
            </div>

            <div className="py-4 grid grid-cols-4 gap-2 text-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#119C49] text-white flex items-center justify-center font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#119C49] mt-1.5">Confirmed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-xs animate-pulse">
                  <ChefHat className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#1A1D1F] mt-1.5">Kitchen</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBECEF] text-[#7C828D] flex items-center justify-center font-bold text-xs">
                  <Bike className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#7C828D] mt-1.5">Dispatched</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBECEF] text-[#7C828D] flex items-center justify-center font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#7C828D] mt-1.5">Delivered</span>
              </div>
            </div>

            <p className="text-xs text-[#7C828D] text-center bg-[#F6F7F9] py-2 rounded-xl">
              Estimated delivery time: 35-45 minutes. We will contact you at {customerPhone}.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7C828D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-[#EBECEF] text-sm text-[#1A1D1F] focus:outline-none focus:ring-2 focus:ring-[#119C49]"
          />
        </div>

        {/* Categories */}
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

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-4 border border-[#EBECEF] flex items-center justify-between gap-3 shadow-2xs hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-[#1A1D1F] truncate">{item.name}</h4>
                {item.description && (
                  <p className="text-xs text-[#7C828D] line-clamp-1 mt-0.5">{item.description}</p>
                )}
                <p className="text-sm font-black text-[#119C49] mt-2">
                  Rs. {Number(item.base_price).toLocaleString()}
                </p>
              </div>

              <Button
                onClick={() => handleAddToCart(item)}
                className="h-9 px-3 rounded-2xl bg-[#D1F0DC] hover:bg-[#119C49] text-[#119C49] hover:text-white font-extrabold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto z-40">
          <div
            onClick={() => setIsCheckoutOpen(true)}
            className="bg-[#119C49] text-white rounded-3xl p-4 shadow-xl flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items in bag
                </p>
                <p className="text-base font-black text-white">Rs. {total.toLocaleString()}</p>
              </div>
            </div>

            <Button className="h-10 px-5 rounded-2xl bg-white text-[#119C49] font-black text-sm flex items-center gap-1">
              <span>Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#EBECEF]">
            <DialogTitle className="text-xl font-black text-[#1A1D1F] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#119C49]" />
              <span>Checkout ({orderMode === 'delivery' ? 'Delivery' : 'Pickup'})</span>
            </DialogTitle>
          </DialogHeader>

          {/* Cart Items */}
          <div className="py-3 space-y-2.5 max-h-48 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.cart_id} className="bg-[#F6F7F9] p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-extrabold text-[#1A1D1F]">{item.name}</h5>
                  <p className="text-xs font-bold text-[#119C49]">
                    Rs. {(item.unit_price * item.quantity).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-[#EBECEF]">
                  <button onClick={() => updateCartQty(item.cart_id, -1)} className="text-[#7C828D]">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black min-w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQty(item.cart_id, 1)} className="text-[#119C49]">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Details */}
          <div className="space-y-3 pt-3 border-t border-[#EBECEF]">
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">Your Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Kasun Fernando"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#119C49] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">Phone Number *</label>
              <input
                type="tel"
                placeholder="077 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#119C49] focus:outline-none"
              />
            </div>

            {orderMode === 'delivery' && (
              <div>
                <label className="text-xs font-bold text-[#1A1D1F] block mb-1">Delivery Address *</label>
                <textarea
                  rows={2}
                  placeholder="Street address, apartment/house number, city"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#119C49] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">Order Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Leave at gate, call upon arrival"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs focus:ring-2 focus:ring-[#119C49] focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-[#EBECEF] space-y-1 text-xs">
            <div className="flex justify-between text-[#7C828D]">
              <span>Subtotal</span>
              <span className="font-bold text-[#1A1D1F]">Rs. {subtotal.toLocaleString()}</span>
            </div>
            {orderMode === 'delivery' && (
              <div className="flex justify-between text-[#7C828D]">
                <span>Delivery Fee</span>
                <span className="font-bold text-[#1A1D1F]">Rs. {deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-[#1A1D1F] pt-1 border-t border-[#EBECEF]">
              <span>Total Payable (Cash / Card on Delivery)</span>
              <span className="text-[#119C49]">Rs. {total.toLocaleString()}</span>
            </div>
          </div>

          <Button
            onClick={handleSubmitOrder}
            disabled={
              isSubmitting ||
              cart.length === 0 ||
              !customerName.trim() ||
              !customerPhone.trim() ||
              (orderMode === 'delivery' && !deliveryAddress.trim())
            }
            className="w-full h-12 mt-4 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white font-black text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Placing Order...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Confirm & Place Order</span>
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
