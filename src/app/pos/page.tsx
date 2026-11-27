'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Edit2,
  Trash2,
  Wallet,
  CreditCard,
  QrCode,
  PauseCircle,
  Play,
  CheckCircle2,
  AlertCircle,
  Flame,
  Coffee,
  IceCream,
  Soup,
  Pizza,
  Sandwich,
  Utensils,
  Layers,
  Sparkles,
  Leaf,
  Beef,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { useMenuStore } from '@/stores/menu-store';
import { useCartStore } from '@/stores/cart-store';
import { useBranchStore } from '@/stores/branch-store';
import { saveOfflineOrder } from '@/lib/offline/sync-queue';
import { MenuItem } from '@/types/menu.types';
import { OrderType } from '@/types/pos.types';
import { formatLKR } from '@/lib/utils/currency';
import { ItemCustomizerModal } from '@/components/pos/item-customizer-modal';
import { TablePickerModal } from '@/components/pos/table-picker-modal';
import { HoldOrdersModal } from '@/components/pos/hold-orders-modal';
import { PaymentSuccessModal } from '@/components/pos/payment-success-modal';
import { CustomerPickerModal } from '@/components/pos/customer-picker-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, Award, Tag, Lock, ShieldCheck, Percent } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PosBillingPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { activeShift, hasActiveShift } = useShiftStore();
  const { activeBranchId } = useBranchStore();
  const { categories, items, fetchMenu } = useMenuStore();

  const {
    orderType,
    tableId,
    tableNumber,
    customerId,
    customerName,
    customerPhone,
    customerTier,
    customerLoyaltyPoints,
    loyaltyPointsToRedeem,
    activePromoId,
    activePromoName,
    deliveryAddress,
    deliveryFee,
    discountAmount,
    discountReason,
    orderNotes,
    items: cartItems,
    heldOrders,
    setOrderType,
    setTable,
    setCustomer,
    setCustomerDetails,
    setRedeemLoyaltyPoints,
    setActivePromotion,
    setDeliveryFee,
    setDiscount,
    setOrderNotes,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    holdCurrentOrder,
    getSubtotal,
    getServiceCharge,
    getTotal,
  } = useCartStore();

  // Modals state
  const [selectedItemForCustomizer, setSelectedItemForCustomizer] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [isHoldOrdersOpen, setIsHoldOrdersOpen] = useState(false);
  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = useState(false);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isManualDiscountOpen, setIsManualDiscountOpen] = useState(false);
  const [manualDiscountInput, setManualDiscountInput] = useState<number>(0);
  const [manualDiscountReason, setManualDiscountReason] = useState<string>('Cashier Courtesy');
  const [managerPinInput, setManagerPinInput] = useState<string>('');
  const [managerPinError, setManagerPinError] = useState<string | null>(null);

  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'credit_card' | 'qr_payment'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment Success Details
  const [successDetails, setSuccessDetails] = useState({
    orderNumber: '',
    orderId: '',
    totalAmount: 0,
    paymentMethod: 'cash',
    paymentTime: '',
    subtotal: 0,
    serviceCharge: 0,
    tableNumber: null as string | null,
    items: [] as Array<{ name: string; quantity: number; price: number }>,
  });

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live Kitchen Orders Strip State
  const [liveOrders, setLiveOrders] = useState<Array<{
    id: string;
    order_number: string;
    table_number?: string | null;
    customer_name?: string | null;
    items_count: number;
    kds_status: string;
  }>>([]);

  // Fetch Live Orders for Bottom Strip
  const fetchLiveOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          kds_status,
          customer_id,
          customers (name),
          dining_tables (table_number),
          order_items (id, quantity)
        `)
        .eq('branch_id', '00000000-0000-0000-0000-000000000001')
        .in('kds_status', ['submitted', 'in_preparation', 'partially_ready', 'ready'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const formatted = data.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          table_number: o.dining_tables?.table_number || null,
          customer_name: o.customers?.name || null,
          items_count: (o.order_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
          kds_status: o.kds_status,
        }));
        setLiveOrders(formatted);
      }
    } catch (e) {
      console.warn('Error fetching live kitchen orders for bottom strip:', e);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    fetchLiveOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('pos-live-bottom-strip')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchLiveOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_routing_tickets' }, () => {
        fetchLiveOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMenu, fetchLiveOrders]);

  // Fallback category icon mapper
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('soup')) return Soup;
    if (lower.includes('burger')) return Sandwich;
    if (lower.includes('pizza') || lower.includes('pasta')) return Pizza;
    if (lower.includes('beverage') || lower.includes('drink') || lower.includes('coffee')) return Coffee;
    if (lower.includes('dessert') || lower.includes('cake') || lower.includes('ice')) return IceCream;
    if (lower.includes('hot') || lower.includes('rice') || lower.includes('curry')) return Flame;
    return Utensils;
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (!item.is_available) return false;
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate cart quantities per menu item
  const getItemCartQuantity = (menuItemId: string) => {
    return cartItems
      .filter((i) => i.menu_item_id === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  // Quick Add Item
  const handleQuickAdd = (item: MenuItem) => {
    // If item has variants or modifier groups, open customizer modal
    const hasVariants = item.variants && item.variants.length > 0;
    const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0;

    if (hasVariants || hasModifiers) {
      setSelectedItemForCustomizer(item);
      setIsCustomizerOpen(true);
      return;
    }

    addItem({
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: Number(item.base_price),
      quantity: 1,
      station_id: item.default_station_id,
      modifiers: [],
    });
  };

  // Decrement Item in Cart
  const handleDecrement = (menuItemId: string) => {
    const cartItem = cartItems.find((i) => i.menu_item_id === menuItemId);
    if (!cartItem) return;
    updateItemQuantity(cartItem.cart_item_id, cartItem.quantity - 1);
  };

  // Auto-evaluate Happy-Hour and Combo Promotions
  useEffect(() => {
    const evaluatePromos = async () => {
      if (cartItems.length === 0) {
        if (activePromoId) setActivePromotion(null, null, 0);
        return;
      }
      try {
        const res = await fetch('/api/promotions/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems.map((i) => {
              const menuItem = items.find((mi) => mi.id === i.menu_item_id);
              return {
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                category_id: menuItem?.category_id || undefined,
              };
            }),
            subtotal: getSubtotal(),
          }),
        });
        const data = await res.json();
        if (data.success && data.discounts && data.discounts.length > 0) {
          const topPromo = data.discounts[0];
          setActivePromotion(topPromo.promotion_id, topPromo.name, data.total_discount);
        }
      } catch (err) {
        console.error('Failed to auto-evaluate promotions', err);
      }
    };
    evaluatePromos();
  }, [cartItems]);

  // Apply manual discount with role authorization check
  const handleApplyManualDiscount = () => {
    const sub = getSubtotal();
    const discountVal = Number(manualDiscountInput);
    if (discountVal <= 0) {
      setDiscount(0, '');
      setIsManualDiscountOpen(false);
      return;
    }

    const discountRatio = sub > 0 ? (discountVal / sub) : 0;
    // If discount exceeds 10%, require Manager (2222) or Owner (1111) PIN
    if (discountRatio > 0.10) {
      if (managerPinInput !== '2222' && managerPinInput !== '1111') {
        setManagerPinError('Discounts over 10% require Manager (2222) or Owner (1111) PIN authorization');
        return;
      }
    }

    setDiscount(discountVal, manualDiscountReason || 'Manual Cashier Discount');
    setIsManualDiscountOpen(false);
    setManagerPinError(null);
    setManagerPinInput('');
  };

  // Submit Order & Settle Payment
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    if (orderType === 'dine_in' && !tableId) {
      setIsTablePickerOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const cashierId = currentUser?.id || '33333333-3333-3333-3333-333333333333';
      const shiftId = activeShift?.id || null;

      // 1. Submit Order
      const orderPayload = {
        branchId: activeBranchId || '00000000-0000-0000-0000-000000000001',
        cashierId,
        shiftId,
        orderType,
        tableId: orderType === 'dine_in' ? tableId : undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
        deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
        discountAmount: discountAmount + (loyaltyPointsToRedeem || 0),
        discountReason: loyaltyPointsToRedeem > 0
          ? `${discountReason ? discountReason + ' + ' : ''}Redeemed ${loyaltyPointsToRedeem} pts`
          : (discountReason || undefined),
        loyaltyPointsRedeemed: loyaltyPointsToRedeem || 0,
        promotionId: activePromoId || undefined,
        notes: orderNotes || undefined,
        idempotencyKey: crypto.randomUUID(),
        items: cartItems.map((item) => ({
          menu_item_id: item.menu_item_id,
          variant_id: item.variant_id || undefined,
          item_name: item.item_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          station_id: item.station_id || undefined,
          notes: item.notes || undefined,
          modifiers: item.modifiers || [],
        })),
      };

      // Handle Offline Billing
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveOfflineOrder(orderPayload);
        const tempOrderNum = `OFFLINE-${Date.now().toString().slice(-6)}`;
        setSuccessDetails({
          orderNumber: tempOrderNum,
          orderId: tempOrderNum,
          totalAmount: getTotal(),
          paymentMethod: selectedPaymentMethod,
          paymentTime: new Date().toLocaleTimeString(),
          subtotal: getSubtotal(),
          serviceCharge: getServiceCharge(),
          tableNumber: tableNumber || null,
          items: cartItems.map((i) => ({
            name: i.item_name,
            quantity: i.quantity,
            price: i.unit_price,
          })),
        });
        clearCart();
        setIsPaymentSuccessOpen(true);
        return;
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to submit order');
      }

      const createdOrderId = orderData.orderId;
      const createdOrderNumber = orderData.orderNumber;
      const orderTotal = Number(orderData.totalAmount || getTotal());

      // 2. Settle Payment Immediately
      const paymentRes = await fetch('/api/payments/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrderId,
          cashierId,
          shiftId,
          payments: [
            {
              method: selectedPaymentMethod,
              amount: orderTotal,
              transactionRef: selectedPaymentMethod !== 'cash' ? `TX-${Date.now().toString().slice(-6)}` : undefined,
            },
          ],
        }),
      });

      const paymentData = await paymentRes.json();

      // 3. Set Success State & Open Modal
      const nowFormatted = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      setSuccessDetails({
        orderNumber: createdOrderNumber,
        orderId: createdOrderId,
        totalAmount: orderTotal,
        paymentMethod: selectedPaymentMethod,
        paymentTime: nowFormatted,
        subtotal: getSubtotal(),
        serviceCharge: getServiceCharge(),
        tableNumber: tableNumber || null,
        items: cartItems.map((i) => ({
          name: i.item_name,
          quantity: i.quantity,
          price: i.unit_price,
        })),
      });

      // Clear cart
      clearCart();
      setIsPaymentSuccessOpen(true);
      fetchLiveOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = getSubtotal();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#F6F7F9]">
      {/* ========================================================================= */}
      {/* CENTER WORKSPACE: Search + Categories + 3-Col Product Grid + Bottom Strip */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="p-4 pb-2 flex items-center justify-between gap-3 bg-[#F6F7F9] shrink-0">
          {/* Wide Rounded-Full Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7C828D]" />
            <input
              type="text"
              placeholder="Search Product here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-[#EBECEF] text-xs font-semibold text-[#1A1D1F] placeholder-[#7C828D] shadow-sm focus:outline-none focus:border-[#119C49] focus:ring-1 focus:ring-[#119C49]"
            />
          </div>

          {/* Right Action Icons: Filter & Parked Orders */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-12 h-12 rounded-full bg-white border border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] flex items-center justify-center shadow-sm transition hover:bg-[#F4F5F7]"
              title="Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Hold Orders Button */}
            <button
              type="button"
              onClick={() => setIsHoldOrdersOpen(true)}
              className="h-12 px-4 rounded-full bg-white border border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] flex items-center gap-2 text-xs font-bold shadow-sm transition hover:bg-[#F4F5F7]"
              title="Parked / Held Orders"
            >
              <PauseCircle className="w-4 h-4 text-[#F59E0B]" />
              <span className="hidden sm:inline">Parked</span>
              {heldOrders.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#FEF3E2] text-[#F59E0B] font-bold text-[10px] flex items-center justify-center">
                  {heldOrders.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Horizontal Category Cards */}
        <div className="px-4 py-2 flex items-center gap-3 overflow-x-auto scrollbar-none shrink-0">
          {/* Card: All */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`min-w-[110px] p-3 rounded-2xl border transition-all text-left flex flex-col justify-between shadow-sm shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#D1F0DC] border-[#BDE8CB] text-[#119C49]'
                : 'bg-white border-[#EBECEF] text-[#1A1D1F] hover:border-[#119C49]/40'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
              selectedCategory === 'all' ? 'bg-[#119C49] text-white' : 'bg-[#F4F5F7] text-[#7C828D]'
            }`}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">All</p>
              <p className={`text-[10px] ${selectedCategory === 'all' ? 'text-[#119C49]' : 'text-[#7C828D]'}`}>
                {items.length} Items
              </p>
            </div>
          </button>

          {/* Category Cards from DB */}
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            const isSelected = selectedCategory === cat.id;
            const categoryItemCount = items.filter((i) => i.category_id === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-w-[115px] p-3 rounded-2xl border transition-all text-left flex flex-col justify-between shadow-sm shrink-0 ${
                  isSelected
                    ? 'bg-[#D1F0DC] border-[#BDE8CB] text-[#119C49]'
                    : 'bg-white border-[#EBECEF] text-[#1A1D1F] hover:border-[#119C49]/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                  isSelected ? 'bg-[#119C49] text-white' : 'bg-[#F4F5F7] text-[#7C828D]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight truncate">{cat.name}</p>
                  <p className={`text-[10px] ${isSelected ? 'text-[#119C49]' : 'text-[#7C828D]'}`}>
                    {categoryItemCount} Items
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 3-Column Product Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 scrollbar-none">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-[#EBECEF]">
              <UtensilsCrossed className="w-10 h-10 text-[#7C828D]/50 mb-2" />
              <p className="text-sm font-bold text-[#1A1D1F]">No Menu Items Found</p>
              <p className="text-xs text-[#7C828D]">Try selecting another category or searching differently.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, idx) => {
                const cartQty = getItemCartQuantity(item.id);
                const isInCart = cartQty > 0;
                const isVeg = item.name.toLowerCase().includes('salad') || item.name.toLowerCase().includes('veg') || item.name.toLowerCase().includes('latte') || item.name.toLowerCase().includes('coffee') || item.name.toLowerCase().includes('cake');
                const hasDiscount = idx % 3 === 0; // decorative 20% off badge on select items matching mockup

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-3 bg-white border transition-all duration-200 shadow-sm flex flex-col justify-between relative group ${
                      isInCart
                        ? 'border-2 border-[#119C49] shadow-md shadow-[#119C49]/10'
                        : 'border-[#EBECEF] hover:border-[#119C49]/40 hover:shadow-md'
                    }`}
                  >
                    {/* Top Dish Image + Optional Discount Badge */}
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-[#F4F5F7] mb-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#7C828D] bg-gradient-to-br from-[#F8F9FA] to-[#EDF0F3]">
                          <UtensilsCrossed className="w-8 h-8 mb-1 text-[#119C49]/40" />
                          <span className="text-[10px] font-bold text-[#7C828D]">Freshly Prepared</span>
                        </div>
                      )}

                      {/* 20% Off Badge */}
                      {hasDiscount && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B] text-white shadow-sm">
                          20% Off
                        </span>
                      )}
                    </div>

                    {/* Dish Title & Price Row */}
                    <div className="mb-3">
                      <h4 className="text-xs font-bold text-[#1A1D1F] line-clamp-2 leading-snug min-h-[32px]">
                        {item.name}
                      </h4>

                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm font-black text-[#119C49] font-mono">
                          {formatLKR(Number(item.base_price))}
                        </span>

                        {/* Veg / Non-Veg Indicator */}
                        {isVeg ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#119C49] bg-[#D1F0DC] px-2 py-0.5 rounded-full">
                            <Leaf className="w-3 h-3" />
                            <span>Veg</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Beef className="w-3 h-3" />
                            <span>Non Veg</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Button: 'Add to Dish' or Circular Steppers */}
                    <div>
                      {isInCart ? (
                        <div className="flex items-center justify-between bg-[#F8F9FA] p-1 rounded-xl border border-[#EBECEF]">
                          <button
                            type="button"
                            onClick={() => handleDecrement(item.id)}
                            className="w-8 h-8 rounded-full bg-[#119C49] text-white flex items-center justify-center font-bold hover:bg-[#0E853E] transition shadow-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-extrabold text-sm text-[#1A1D1F] font-mono">
                            {cartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(item)}
                            className="w-8 h-8 rounded-full bg-[#119C49] text-white flex items-center justify-center font-bold hover:bg-[#0E853E] transition shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleQuickAdd(item)}
                          className="w-full h-10 bg-[#D8F3E2] hover:bg-[#C6ECD4] text-[#119C49] font-bold text-xs rounded-xl transition shadow-none border-none"
                        >
                          Add to Dish
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Pinned Live Kitchen Orders Strip */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#EBECEF] px-4 flex items-center gap-3 overflow-x-auto scrollbar-none shadow-lg z-20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C828D] whitespace-nowrap shrink-0">
            Live Kitchen:
          </span>

          {liveOrders.length === 0 ? (
            <span className="text-xs text-[#7C828D]">No pending orders in kitchen prep.</span>
          ) : (
            liveOrders.map((ord) => (
              <div
                key={ord.id}
                className="px-3.5 py-1.5 rounded-full bg-white border border-[#EBECEF] shadow-sm flex items-center gap-2.5 shrink-0"
              >
                {/* Circular Amber Table Badge */}
                <div className="w-7 h-7 rounded-full bg-[#F59E0B] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                  {ord.table_number || 'T1'}
                </div>

                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-[#1A1D1F] truncate max-w-[120px]">
                    {ord.customer_name || ord.order_number}
                  </p>
                  <p className="text-[10px] text-[#7C828D]">
                    {ord.items_count} items &rarr; Kitchen
                  </p>
                </div>

                {/* Status Pill */}
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    ord.kds_status === 'ready'
                      ? 'bg-[#D1F0DC] text-[#119C49]'
                      : 'bg-[#FEF3E2] text-[#F59E0B]'
                  }`}
                >
                  {ord.kds_status === 'ready' ? 'Ready' : 'Process'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT ORDER CART & PAYMENT PANEL (w-[380px] bg-white)                     */}
      {/* ========================================================================= */}
      <aside className="w-[380px] bg-white border-l border-[#EBECEF] flex flex-col justify-between h-full shrink-0 shadow-lg z-20">
        {/* Top Header: Table info + Staff Subtitle */}
        <div className="p-4 border-b border-[#F4F5F7] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#1A1D1F] tracking-tight">
              {orderType === 'dine_in'
                ? tableNumber
                  ? `Table ${tableNumber}`
                  : 'Select Table'
                : orderType === 'takeaway'
                ? 'Take Away'
                : 'Delivery'}
            </h3>
            <p className="text-xs text-[#7C828D]">
              {currentUser?.display_name || 'Staff Member'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (orderType === 'dine_in') setIsTablePickerOpen(true);
            }}
            className="w-9 h-9 rounded-full bg-[#F4F5F7] text-[#7C828D] hover:text-[#1A1D1F] flex items-center justify-center transition"
            title="Edit Table / Details"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Switcher: Dine In, Take Away, Delivery */}
        <div className="px-4 py-2">
          <div className="bg-[#F4F5F7] p-1 rounded-full flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition text-center ${
                orderType === 'dine_in'
                  ? 'bg-[#D1F0DC] text-[#119C49] shadow-sm'
                  : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              Dine in
            </button>
            <button
              type="button"
              onClick={() => setOrderType('takeaway')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition text-center ${
                orderType === 'takeaway'
                  ? 'bg-[#D1F0DC] text-[#119C49] shadow-sm'
                  : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              Take Away
            </button>
            <button
              type="button"
              onClick={() => setOrderType('delivery')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition text-center ${
                orderType === 'delivery'
                  ? 'bg-[#D1F0DC] text-[#119C49] shadow-sm'
                  : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              Delivery
            </button>
          </div>
        </div>

        {/* Customer / Loyalty Picker Bar */}
        <div className="px-4 py-1.5 border-b border-[#F4F5F7]">
          {customerId ? (
            <div className="p-2.5 rounded-2xl bg-[#D1F0DC]/40 border border-[#119C49]/40 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-[#119C49] text-white flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight truncate">
                  <span className="font-extrabold text-xs text-[#1A1D1F] block truncate">
                    {customerName}
                  </span>
                  <span className="text-[10px] text-[#119C49] font-bold">
                    {customerTier} &bull; {customerLoyaltyPoints} Pts
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomerPickerOpen(true)}
                className="text-[11px] font-bold text-[#119C49] hover:underline shrink-0 ml-2"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCustomerPickerOpen(true)}
              className="w-full py-2 px-3 rounded-2xl bg-[#F6F7F9] hover:bg-white border border-dashed border-[#EBECEF] hover:border-[#119C49] text-xs font-bold text-[#7C828D] hover:text-[#119C49] flex items-center justify-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-[#119C49]" />
              <span>+ Attach Customer (Loyalty)</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 scrollbar-none">
          {cartItems.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-[#7C828D]">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30 text-[#119C49]" />
              <p className="text-xs font-bold text-[#1A1D1F]">Your Cart is Empty</p>
              <p className="text-[11px] text-[#7C828D]">Tap &quot;Add to Dish&quot; on any product to ring an order.</p>
            </div>
          ) : (
            cartItems.map((cItem) => (
              <div
                key={cItem.cart_item_id}
                className="bg-[#F8F9FA] rounded-2xl p-3 border border-[#EBECEF] flex items-center justify-between gap-3 shadow-none hover:border-[#119C49]/40 transition"
              >
                {/* Details */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#EBECEF] flex items-center justify-center font-bold text-[#119C49] text-xs shrink-0 font-mono">
                    {cItem.quantity}x
                  </div>
                  <div className="overflow-hidden leading-tight">
                    <p className="text-xs font-bold text-[#1A1D1F] truncate">{cItem.item_name}</p>
                    <p className="text-[10px] text-[#7C828D] font-mono mt-0.5">
                      {formatLKR(cItem.unit_price)} &bull; {cItem.quantity}X
                    </p>
                  </div>
                </div>

                {/* Subtotal & Remove */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#119C49] font-mono whitespace-nowrap">
                    {formatLKR(cItem.unit_price * cItem.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(cItem.cart_item_id)}
                    className="w-6 h-6 rounded-full hover:bg-rose-50 text-[#7C828D] hover:text-rose-600 flex items-center justify-center transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Cart Financials & Payment Submission */}
        <div className="p-4 border-t border-[#F4F5F7] space-y-3 bg-[#FCFCFD]">
          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#7C828D]">
              <span>Sub Total</span>
              <span className="font-bold text-[#1A1D1F] font-mono">{formatLKR(subtotal)}</span>
            </div>

            {/* Promotion Discount */}
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-[#119C49]">
                <span className="flex items-center gap-1 font-semibold truncate max-w-[200px]">
                  <Tag className="w-3.5 h-3.5 shrink-0" /> {discountReason || 'Promo Discount'}
                </span>
                <span className="font-bold font-mono shrink-0">-{formatLKR(discountAmount)}</span>
              </div>
            )}

            {/* Loyalty Points Redemption Toggle */}
            {customerId && customerLoyaltyPoints > 0 && (
              <div className="p-2 rounded-xl bg-[#FEF3E2] border border-[#F59E0B]/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#1A1D1F]">
                  <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="font-bold">Redeem Points</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (loyaltyPointsToRedeem > 0) {
                      setRedeemLoyaltyPoints(0);
                    } else {
                      setRedeemLoyaltyPoints(Math.min(customerLoyaltyPoints, Math.floor(subtotal)));
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition font-mono ${
                    loyaltyPointsToRedeem > 0
                      ? 'bg-[#119C49] text-white shadow-sm'
                      : 'bg-white text-[#F59E0B] border border-[#F59E0B]/40'
                  }`}
                >
                  {loyaltyPointsToRedeem > 0
                    ? `-${formatLKR(loyaltyPointsToRedeem)} (Active)`
                    : `Apply (${customerLoyaltyPoints} Pts)`}
                </button>
              </div>
            )}

            {orderType === 'dine_in' && (
              <div className="flex items-center justify-between text-[#7C828D]">
                <span>Service Charge (10%)</span>
                <span className="font-bold text-[#1A1D1F] font-mono">{formatLKR(serviceCharge)}</span>
              </div>
            )}

            {/* Manual Discount Trigger */}
            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setManualDiscountInput(discountAmount > 0 && !activePromoId ? discountAmount : 0);
                  setManagerPinError(null);
                  setManagerPinInput('');
                  setIsManualDiscountOpen(true);
                }}
                className="text-[11px] font-bold text-[#7C828D] hover:text-[#119C49] flex items-center gap-1"
              >
                <Percent className="w-3 h-3" />
                <span>
                  {discountAmount > 0 && !activePromoId
                    ? 'Edit Manual Discount'
                    : '+ Add Manual Discount'}
                </span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#EBECEF] flex items-center justify-between text-sm font-extrabold text-[#1A1D1F]">
              <span>Total Amount</span>
              <span className="text-base text-[#119C49] font-mono">{formatLKR(total)}</span>
            </div>
          </div>

          {/* 3 Payment Method Tiles: Cash, Credit Card, QR Code */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('cash')}
              className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition text-xs font-bold ${
                selectedPaymentMethod === 'cash'
                  ? 'bg-[#D1F0DC] border-[#119C49] text-[#119C49] shadow-sm'
                  : 'bg-white border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('credit_card')}
              className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition text-xs font-bold ${
                selectedPaymentMethod === 'credit_card'
                  ? 'bg-[#D1F0DC] border-[#119C49] text-[#119C49] shadow-sm'
                  : 'bg-white border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-[10px]">Card</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('qr_payment')}
              className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition text-xs font-bold ${
                selectedPaymentMethod === 'qr_payment'
                  ? 'bg-[#D1F0DC] border-[#119C49] text-[#119C49] shadow-sm'
                  : 'bg-white border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px]">QR Code</span>
            </button>
          </div>

          {/* Place Order Primary Action Button */}
          <Button
            type="button"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handlePlaceOrder}
            className="w-full h-14 bg-[#119C49] hover:bg-[#0E853E] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-[#119C49]/25 transition"
          >
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </Button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* GLOBAL MODALS */}
      <ItemCustomizerModal
        isOpen={isCustomizerOpen}
        onOpenChange={setIsCustomizerOpen}
        item={selectedItemForCustomizer}
        onAddToCart={(configuredItem) => {
          addItem(configuredItem);
          setIsCustomizerOpen(false);
        }}
      />

      <TablePickerModal
        isOpen={isTablePickerOpen}
        onOpenChange={setIsTablePickerOpen}
        selectedTableId={tableId}
        onSelectTable={(selectedId, selectedNumber) => {
          setTable(selectedId, selectedNumber);
          setIsTablePickerOpen(false);
        }}
      />

      <HoldOrdersModal
        isOpen={isHoldOrdersOpen}
        onOpenChange={setIsHoldOrdersOpen}
      />

      <PaymentSuccessModal
        isOpen={isPaymentSuccessOpen}
        onClose={() => setIsPaymentSuccessOpen(false)}
        orderNumber={successDetails.orderNumber}
        orderId={successDetails.orderId}
        totalAmount={successDetails.totalAmount}
        paymentMethod={successDetails.paymentMethod}
        paymentTime={successDetails.paymentTime}
        subtotal={successDetails.subtotal}
        serviceCharge={successDetails.serviceCharge}
        tableNumber={successDetails.tableNumber}
        items={successDetails.items}
        onNewOrder={() => {
          setIsPaymentSuccessOpen(false);
          clearCart();
        }}
      />

      <CustomerPickerModal
        isOpen={isCustomerPickerOpen}
        onClose={() => setIsCustomerPickerOpen(false)}
        selectedCustomerId={customerId}
        onSelectCustomer={(cust) => {
          setCustomerDetails(cust);
          if (cust && cust.loyalty_points > 0) {
            // By default don't auto-redeem, cashier can toggle
            setRedeemLoyaltyPoints(0);
          }
        }}
      />

      {/* Manual Discount with Manager PIN check */}
      <Dialog open={isManualDiscountOpen} onOpenChange={setIsManualDiscountOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F] flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#119C49]" />
              <span>Manual Order Discount</span>
            </DialogTitle>
          </DialogHeader>

          {managerPinError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{managerPinError}</span>
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">
                Discount Amount (LKR)
              </label>
              <Input
                type="number"
                step="10"
                min="0"
                value={manualDiscountInput}
                onChange={(e) => {
                  setManualDiscountInput(parseFloat(e.target.value) || 0);
                  setManagerPinError(null);
                }}
                className="h-10 rounded-2xl font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-[#7C828D] block mt-1">
                Subtotal: {formatLKR(getSubtotal())} &bull; Max 10% without Manager PIN: {formatLKR(getSubtotal() * 0.1)}
              </span>
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Reason / Note</label>
              <Input
                type="text"
                placeholder="Cashier courtesy, owner guest, VIP discount"
                value={manualDiscountReason}
                onChange={(e) => setManualDiscountReason(e.target.value)}
                className="h-10 rounded-2xl"
              />
            </div>

            {/* If discount > 10%, prompt for Manager PIN */}
            {getSubtotal() > 0 && (manualDiscountInput / getSubtotal()) > 0.10 && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                <label className="font-bold text-red-700 block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Manager Authorization Required (&gt; 10%)</span>
                </label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                  className="h-11 rounded-2xl text-center text-lg font-mono tracking-widest bg-white"
                />
                <p className="text-[10px] text-red-600 text-center">
                  Enter Manager (2222) or Owner (1111) PIN
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManualDiscountOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyManualDiscount}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
