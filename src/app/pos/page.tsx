'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  UtensilsCrossed,
  ShoppingBag,
  Trash2,
  Wallet,
  CreditCard,
  QrCode,
  PauseCircle,
  AlertCircle,
  Flame,
  Coffee,
  IceCream,
  Soup,
  Pizza,
  Sandwich,
  Utensils,
  Layers,
  Leaf,
  Beef,
  Users,
  Award,
  Tag,
  Lock,
  Percent,
  MapPin,
  MessageCircle,
  Printer,
  Grid3X3,
  BookmarkPlus,
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
import { DishImage } from '@/components/ui/dish-image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { broadcastCfdState, mapCartItemsForCfd } from '@/lib/pos/cfd-sync';

type PosTenderMethod = 'cash' | 'credit_card' | 'qr_payment' | 'whatsapp_ebill';

export default function PosBillingPage() {
  const { currentUser } = useAuthStore();
  const { activeShift, hasActiveShift } = useShiftStore();
  const { activeBranchId, activeBranch } = useBranchStore();
  const { categories, items, fetchMenu } = useMenuStore();

  const searchInputRef = useRef<HTMLInputElement>(null);

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
    deliveryAddress,
    deliveryFee,
    discountAmount,
    discountReason,
    orderNotes,
    items: cartItems,
    heldOrders,
    setOrderType,
    setTable,
    setCustomerDetails,
    setRedeemLoyaltyPoints,
    setActivePromotion,
    setDiscount,
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PosTenderMethod>('cash');
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
    customerPhone: null as string | null,
    items: [] as Array<{ name: string; quantity: number; price: number }>,
  });

  // Hydration Guard for persisted Zustand stores (cart, branch, shift, menu)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Quick Search `/` Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Live Orders for Top Queue Bar
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
        .eq('branch_id', activeBranchId || '00000000-0000-0000-0000-000000000001')
        .in('kds_status', ['submitted', 'in_preparation', 'partially_ready', 'ready'])
        .order('created_at', { ascending: false })
        .limit(8);

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
      console.warn('Error fetching live kitchen orders:', e);
    }
  }, [activeBranchId]);

  useEffect(() => {
    fetchMenu();
    fetchLiveOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('pos-live-kitchen-queue')
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

  // Category 3D Asset Mapper
  const getCategory3DImage = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('burger') || lower.includes('grill') || lower.includes('sandwich')) {
      return '/images/3d/food-burger-3d.jpg';
    }
    if (lower.includes('beverage') || lower.includes('drink') || lower.includes('coffee') || lower.includes('latte') || lower.includes('tea')) {
      return '/images/3d/food-latte-3d.jpg';
    }
    if (lower.includes('rice') || lower.includes('curry') || lower.includes('main') || lower.includes('hot')) {
      return '/images/3d/food-curry-3d.jpg';
    }
    return '/images/3d/food-feast-3d.svg';
  };

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

  const displayCartItems = mounted ? cartItems : [];
  const displayItems = mounted ? items : [];
  const displayCategories = mounted ? categories : [];
  const displayHeldOrders = mounted ? heldOrders : [];
  const displayOrderType = mounted ? orderType : 'dine_in';
  const displayTableId = mounted ? tableId : null;
  const displayTableNumber = mounted ? tableNumber : null;
  const displayCustomerId = mounted ? customerId : null;
  const displayCustomerName = mounted ? customerName : '';
  const displayCustomerTier = mounted ? customerTier : null;
  const displayCustomerLoyaltyPoints = mounted ? customerLoyaltyPoints : 0;
  const displayLoyaltyPointsToRedeem = mounted ? loyaltyPointsToRedeem : 0;
  const displayDiscountAmount = mounted ? discountAmount : 0;
  const displayDiscountReason = mounted ? discountReason : '';
  const displayActivePromoId = mounted ? activePromoId : null;
  const displayActiveShift = mounted ? activeShift : null;
  const displayHasActiveShift = mounted ? hasActiveShift : false;

  // Filter items
  const filteredItems = displayItems.filter((item) => {
    if (!item.is_available) return false;
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate cart quantities per menu item
  const getItemCartQuantity = (menuItemId: string) => {
    return displayCartItems
      .filter((i) => i.menu_item_id === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  // 1-Tap Quick Add (Opens ItemCustomizerModal only when variants/modifiers exist)
  const handleQuickAdd = (item: MenuItem) => {
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
      image_url: item.image_url,
    });
  };

  // Fixed Decrement by 1
  const handleDecrement = (menuItemId: string) => {
    const cartItem = cartItems.find((i) => i.menu_item_id === menuItemId);
    if (!cartItem) return;
    updateItemQuantity(cartItem.cart_item_id, -1);
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

    const discountRatio = sub > 0 ? discountVal / sub : 0;
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
  const handlePlaceOrder = async (overrideMethod?: PosTenderMethod) => {
    if (cartItems.length === 0) return;

    if (orderType === 'dine_in' && !tableId) {
      setIsTablePickerOpen(true);
      return;
    }

    const tenderChoice = overrideMethod || selectedPaymentMethod;
    const dbPaymentMethod = tenderChoice === 'whatsapp_ebill' ? 'qr_payment' : tenderChoice;

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
        discountReason:
          loyaltyPointsToRedeem > 0
            ? `${discountReason ? discountReason + ' + ' : ''}Redeemed ${loyaltyPointsToRedeem} pts`
            : discountReason || undefined,
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
          paymentMethod: tenderChoice,
          paymentTime: new Date().toLocaleTimeString(),
          subtotal: getSubtotal(),
          serviceCharge: getServiceCharge(),
          tableNumber: tableNumber || null,
          customerPhone: customerPhone || null,
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
      await fetch('/api/payments/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrderId,
          cashierId,
          shiftId,
          payments: [
            {
              method: dbPaymentMethod,
              amount: orderTotal,
              transactionRef:
                tenderChoice === 'whatsapp_ebill'
                  ? `WA-EBILL-${Date.now().toString().slice(-6)}`
                  : dbPaymentMethod !== 'cash'
                  ? `TX-${Date.now().toString().slice(-6)}`
                  : undefined,
            },
          ],
        }),
      });

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
        paymentMethod: tenderChoice,
        paymentTime: nowFormatted,
        subtotal: getSubtotal(),
        serviceCharge: getServiceCharge(),
        tableNumber: tableNumber || null,
        customerPhone: customerPhone || null,
        items: cartItems.map((i) => ({
          name: i.item_name,
          quantity: i.quantity,
          price: i.unit_price,
        })),
      });

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

  const subtotal = mounted ? getSubtotal() : 0;
  const serviceCharge = mounted ? getServiceCharge() : 0;
  const total = mounted ? getTotal() : 0;
  const activeBranchName = mounted ? (activeBranch?.name || 'Colombo Main') : 'Colombo Main';

  // Broadcast live POS state to Customer Facing Display (/cfd)
  useEffect(() => {
    if (!mounted) return;
    broadcastCfdState({
      branchName: activeBranchName,
      orderType,
      tableNumber,
      customerName,
      items: mapCartItemsForCfd(cartItems),
      subtotal,
      discountAmount,
      loyaltyDiscount: loyaltyPointsToRedeem || 0,
      serviceCharge,
      total,
      paymentSuccess: isPaymentSuccessOpen
        ? {
            orderNumber: successDetails.orderNumber,
            totalAmount: successDetails.totalAmount,
            paymentMethod: successDetails.paymentMethod,
            paymentTime: successDetails.paymentTime,
          }
        : null,
      updatedAt: Date.now(),
    });
  }, [
    mounted,
    activeBranchName,
    orderType,
    tableNumber,
    customerName,
    cartItems,
    subtotal,
    discountAmount,
    loyaltyPointsToRedeem,
    serviceCharge,
    total,
    isPaymentSuccessOpen,
    successDetails,
  ]);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#f4fbf7]">
      {/* ========================================================================= */}
      {/* CENTER COUNTER WORKSPACE                                                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Compact POS Bar */}
        <header className="px-4 pt-3 pb-2 bg-white border-b border-[#E5ECE8] shrink-0 space-y-2 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Branch Pill + Shift & Drawer Status */}
            <div className="flex items-center gap-2">
              <div className="h-9 px-3 rounded-xl bg-[#072619] text-white flex items-center gap-1.5 text-xs font-bold shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#a3e04f]" />
                <span className="truncate max-w-[130px]">{activeBranchName}</span>
              </div>

              <div
                className={`h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  displayHasActiveShift && displayActiveShift
                    ? 'bg-[#cdeeb0]/40 border-[#0f8a5f]/25 text-[#072619]'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    displayHasActiveShift && displayActiveShift ? 'bg-[#0f8a5f] animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {displayHasActiveShift && displayActiveShift ? (
                  <span className="font-mono">{formatLKR(displayActiveShift.expected_cash)}</span>
                ) : (
                  <span>No Shift</span>
                )}
              </div>
            </div>

            {/* Center: Quick Search with `/` Shortcut */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4f675a]" />
              <input
                ref={searchInputRef}
                id="pos-search-input"
                name="pos-search"
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-12 rounded-xl bg-[#f4fbf7] border border-[#E5ECE8] text-xs font-semibold text-[#072619] placeholder-[#4f675a]/70 focus:outline-none focus:border-[#0f8a5f] focus:bg-white focus:ring-2 focus:ring-[#0f8a5f]/15 transition"
              />
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#4f675a] bg-white border border-[#E5ECE8] rounded-md absolute right-2.5 top-1/2 -translate-y-1/2">
                /
              </kbd>
            </div>

            {/* Right: Park Cart + Hold Orders Badge */}
            <div className="flex items-center gap-2">
              {displayCartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => holdCurrentOrder()}
                  className="h-9 px-3 rounded-xl bg-[#f4fbf7] hover:bg-[#cdeeb0]/50 border border-[#E5ECE8] text-[#072619] flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
                  title="Park current cart to Hold queue"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-[#0f8a5f]" />
                  <span className="hidden xl:inline">Park</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsHoldOrdersOpen(true)}
                className="h-9 px-3 rounded-xl bg-white hover:bg-[#f4fbf7] border border-[#E5ECE8] text-[#072619] flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
                title="Open Parked / Held Orders"
              >
                <PauseCircle className="w-4 h-4 text-[#F59E0B]" />
                <span className="hidden sm:inline">Held</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    displayHeldOrders.length > 0 ? 'bg-[#FEF3E2] text-[#B45309]' : 'bg-[#f4fbf7] text-[#4f675a]'
                  }`}
                >
                  {displayHeldOrders.length}
                </span>
              </button>
            </div>
          </div>

          {/* Live Kitchen Queue Ticker Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4f675a] whitespace-nowrap shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0f8a5f] animate-pulse" />
              Live Kitchen:
            </span>
            {liveOrders.length === 0 ? (
              <span className="text-[11px] text-[#4f675a]/70">No active tickets in prep</span>
            ) : (
              <AnimatePresence>
                {liveOrders.map((ord) => (
                  <motion.div
                    key={ord.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="px-2.5 py-1 rounded-full bg-[#f4fbf7] border border-[#E5ECE8] flex items-center gap-2 shrink-0"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#072619] text-[#a3e04f] font-extrabold text-[10px] flex items-center justify-center">
                      {ord.table_number || ord.order_number.slice(-2)}
                    </span>
                    <span className="text-[11px] font-bold text-[#072619] truncate max-w-[100px]">
                      {ord.customer_name || ord.order_number}
                    </span>
                    <span className="text-[10px] text-[#4f675a] font-mono">{ord.items_count}x</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                        ord.kds_status === 'ready'
                          ? 'bg-[#cdeeb0] text-[#072619]'
                          : 'bg-[#FEF3E2] text-[#B45309]'
                      }`}
                    >
                      {ord.kds_status === 'ready' ? 'Ready' : 'Prep'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </header>

        {/* Tactile 3D Category Cards Strip with Framer Motion layoutId + .pcs-shine */}
        <div className="px-4 py-2.5 flex items-center gap-2.5 overflow-x-auto scrollbar-none shrink-0 border-b border-[#E5ECE8]/70 bg-[#f4fbf7]">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`relative min-w-[118px] px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2.5 shrink-0 cursor-pointer pcs-shine ${
              selectedCategory === 'all'
                ? 'text-white shadow-md shadow-[#0f8a5f]/20'
                : 'bg-white border border-[#E5ECE8] text-[#072619] hover:border-[#0f8a5f]/40'
            }`}
          >
            {selectedCategory === 'all' && (
              <motion.div
                layoutId="active-pos-category"
                className="absolute inset-0 bg-[#072619] rounded-2xl"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <div className="relative z-10 w-8 h-8 rounded-xl overflow-hidden bg-[#f4fbf7] border border-[#E5ECE8] shrink-0 p-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/3d/food-feast-3d.svg" alt="All" className="w-full h-full object-contain" />
            </div>
            <div className="relative z-10 text-left leading-tight">
              <span className="block font-extrabold">All Menu</span>
              <span className={`text-[10px] font-mono ${selectedCategory === 'all' ? 'text-[#a3e04f]' : 'text-[#4f675a]'}`}>
                {displayItems.filter((i) => i.is_available).length} items
              </span>
            </div>
          </button>

          {displayCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const categoryItemCount = displayItems.filter((i) => i.category_id === cat.id && i.is_available).length;
            const img3d = getCategory3DImage(cat.name);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative min-w-[132px] px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2.5 shrink-0 cursor-pointer pcs-shine ${
                  isSelected
                    ? 'text-white shadow-md shadow-[#0f8a5f]/20'
                    : 'bg-white border border-[#E5ECE8] text-[#072619] hover:border-[#0f8a5f]/40'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-pos-category"
                    className="absolute inset-0 bg-[#072619] rounded-2xl"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <div className="relative z-10 w-8 h-8 rounded-xl overflow-hidden bg-[#f4fbf7] border border-[#E5ECE8] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img3d} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 text-left leading-tight min-w-0">
                  <span className="block font-extrabold truncate max-w-[96px]">{cat.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-[#a3e04f]' : 'text-[#4f675a]'}`}>
                    {categoryItemCount} items
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dish Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-6 scrollbar-none">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-[#E5ECE8]">
              <UtensilsCrossed className="w-10 h-10 text-[#4f675a]/40 mb-2" />
              <p className="text-sm font-bold text-[#072619]">No Menu Items Found</p>
              <p className="text-xs text-[#4f675a]">Try selecting another category or clearing your search.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.02 } },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
            >
              {filteredItems.map((item) => {
                const cartQty = getItemCartQuantity(item.id);
                const isInCart = cartQty > 0;
                const isVeg =
                  item.name.toLowerCase().includes('salad') ||
                  item.name.toLowerCase().includes('veg') ||
                  item.name.toLowerCase().includes('latte') ||
                  item.name.toLowerCase().includes('coffee') ||
                  item.name.toLowerCase().includes('cake');
                const hasCustom =
                  (item.variants && item.variants.length > 0) ||
                  (item.modifier_groups && item.modifier_groups.length > 0);
                const matchedCategory = categories.find((c) => c.id === item.category_id)?.name;

                return (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
                    }}
                    className={`rounded-2xl p-2.5 bg-white border transition-all duration-150 flex flex-col justify-between relative group ${
                      isInCart
                        ? 'border-2 border-[#0f8a5f] shadow-md shadow-[#0f8a5f]/10'
                        : 'border-[#E5ECE8] hover:border-[#0f8a5f]/50 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    {/* Top 4:3 Dish Photo + Bold LKR Price Badge + Stock Dot */}
                    <div
                      onClick={() => handleQuickAdd(item)}
                      className="relative w-full rounded-xl overflow-hidden mb-2.5 cursor-pointer"
                    >
                      <DishImage
                        src={item.image_url}
                        alt={item.name}
                        category={matchedCategory}
                        aspectRatio="4/3"
                        className="w-full rounded-xl"
                      />

                      {/* Bold LKR Price Badge */}
                      <span className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-[#072619]/90 text-[#a3e04f] backdrop-blur-xs shadow-sm">
                        {formatLKR(Number(item.base_price))}
                      </span>

                      {/* Stock Indicator Dot + Custom badge */}
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                        {hasCustom && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/95 text-[#072619] border border-[#E5ECE8] shadow-xs">
                            Options
                          </span>
                        )}
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-[#0f8a5f] ring-2 ring-white shadow-xs"
                          title="In Stock & Available"
                        />
                      </div>
                    </div>

                    {/* Dish Title & Veg/Non-Veg Row */}
                    <div className="px-0.5 mb-2.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4
                          onClick={() => handleQuickAdd(item)}
                          className="text-xs font-extrabold text-[#072619] line-clamp-2 leading-snug min-h-[32px] cursor-pointer hover:text-[#0f8a5f] transition"
                        >
                          {item.name}
                        </h4>
                        {isVeg ? (
                          <span className="shrink-0 w-4 h-4 rounded-sm border border-[#0f8a5f] flex items-center justify-center bg-[#f4fbf7]" title="Vegetarian">
                            <Leaf className="w-2.5 h-2.5 text-[#0f8a5f]" />
                          </span>
                        ) : (
                          <span className="shrink-0 w-4 h-4 rounded-sm border border-rose-500 flex items-center justify-center bg-rose-50" title="Non-Veg">
                            <Beef className="w-2.5 h-2.5 text-rose-600" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1-Tap Add or Inline Stepper */}
                    <div>
                      {isInCart ? (
                        <div className="flex items-center justify-between bg-[#f4fbf7] p-1 rounded-xl border border-[#0f8a5f]/30">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDecrement(item.id)}
                            className="w-8 h-8 rounded-lg bg-[#0f8a5f] text-white flex items-center justify-center font-bold hover:bg-[#0b6f4c] transition shadow-2xs cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </motion.button>
                          <span className="font-extrabold text-sm text-[#072619] font-mono">
                            {cartQty}
                          </span>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleQuickAdd(item)}
                            className="w-8 h-8 rounded-lg bg-[#0f8a5f] text-white flex items-center justify-center font-bold hover:bg-[#0b6f4c] transition shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleQuickAdd(item)}
                          className="w-full h-9 bg-[#cdeeb0]/55 hover:bg-[#0f8a5f] text-[#072619] hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>1-Tap Add</span>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT CHECKOUT DOCK (w-[385px] xl:w-[400px] bg-white)                    */}
      {/* ========================================================================= */}
      <aside className="w-[385px] xl:w-[400px] bg-white border-l border-[#E5ECE8] flex flex-col justify-between h-full shrink-0 shadow-lg z-20">
        {/* Top Dock Controls: Order Type + 1-Tap Table & Customer Chips */}
        <div className="p-3.5 border-b border-[#E5ECE8] space-y-2.5 bg-white">
          {/* Segmented Order Type Switcher */}
          <div className="bg-[#f4fbf7] p-1 rounded-xl border border-[#E5ECE8] flex items-center gap-1 relative">
            {(['dine_in', 'takeaway', 'delivery'] as OrderType[]).map((type) => {
              const label =
                type === 'dine_in' ? 'Dine-In' : type === 'takeaway' ? 'Takeaway' : 'Delivery';
              const isSelected = displayOrderType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`relative flex-1 py-1.5 rounded-lg text-xs font-bold transition text-center z-10 cursor-pointer ${
                    isSelected ? 'text-white' : 'text-[#4f675a] hover:text-[#072619]'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-order-type"
                      className="absolute inset-0 bg-[#072619] rounded-lg shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          {/* 1-Tap Table & Customer Attachment Chips */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsTablePickerOpen(true)}
              disabled={displayOrderType !== 'dine_in'}
              className={`h-9 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1.5 transition cursor-pointer ${
                displayOrderType !== 'dine_in'
                  ? 'bg-zinc-50 border-[#E5ECE8] text-[#4f675a]/50 cursor-not-allowed'
                  : displayTableId
                  ? 'bg-[#cdeeb0]/50 border-[#0f8a5f]/40 text-[#072619]'
                  : 'bg-[#f4fbf7] border-dashed border-[#0f8a5f]/40 text-[#0f8a5f] hover:bg-[#cdeeb0]/30'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {displayOrderType !== 'dine_in'
                    ? 'No Table'
                    : displayTableNumber
                    ? `Table ${displayTableNumber}`
                    : 'Pick Table'}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomerPickerOpen(true)}
              className={`h-9 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1.5 transition cursor-pointer ${
                displayCustomerId
                  ? 'bg-[#cdeeb0]/50 border-[#0f8a5f]/40 text-[#072619]'
                  : 'bg-[#f4fbf7] border-dashed border-[#E5ECE8] text-[#4f675a] hover:border-[#0f8a5f] hover:text-[#0f8a5f]'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 shrink-0 text-[#0f8a5f]" />
                <span className="truncate">
                  {displayCustomerId ? displayCustomerName : '+ Customer'}
                </span>
              </span>
              {displayCustomerId && displayCustomerTier && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#072619] text-[#a3e04f] shrink-0">
                  {displayCustomerLoyaltyPoints}p
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cart Items List with Inline `-`/`+` Steppers */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2 scrollbar-none">
          {displayCartItems.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-[#4f675a]">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-25 text-[#0f8a5f]" />
              <p className="text-xs font-bold text-[#072619]">Ready for Fast Billing</p>
              <p className="text-[11px] text-[#4f675a]">Tap any dish photo or press `/` to search menu.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {displayCartItems.map((cItem) => {
                const matchedItem = displayItems.find((i) => i.id === cItem.menu_item_id);
                const imageUrl = cItem.image_url || matchedItem?.image_url;
                const matchedCategory = displayCategories.find((c) => c.id === matchedItem?.category_id)?.name;

                return (
                  <motion.div
                    key={cItem.cart_item_id}
                    initial={{ opacity: 0, height: 0, scale: 0.96 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="bg-[#f4fbf7] rounded-2xl p-2 border border-[#E5ECE8] flex items-center justify-between gap-2 overflow-hidden"
                  >
                    {/* Thumbnail + Name */}
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-[#E5ECE8] bg-white">
                        <DishImage
                          src={imageUrl}
                          alt={cItem.item_name}
                          category={matchedCategory}
                          aspectRatio="square"
                          className="w-full h-full"
                        />
                      </div>
                      <div className="overflow-hidden leading-tight flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#072619] truncate">{cItem.item_name}</p>
                        {cItem.variant_name && (
                          <p className="text-[10px] text-[#0f8a5f] font-semibold truncate">{cItem.variant_name}</p>
                        )}
                        <p className="text-[10px] text-[#4f675a] font-mono mt-0.5">
                          {formatLKR(cItem.unit_price)}
                        </p>
                      </div>
                    </div>

                    {/* Inline `-` / `+` Steppers + Subtotal */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-white rounded-lg border border-[#E5ECE8] p-0.5">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(cItem.cart_item_id, -1)}
                          className="w-6 h-6 rounded-md hover:bg-[#f4fbf7] text-[#4f675a] hover:text-[#072619] flex items-center justify-center transition cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <motion.span
                          key={cItem.quantity}
                          initial={{ scale: 1.35, color: '#0f8a5f' }}
                          animate={{ scale: 1, color: '#072619' }}
                          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                          className="w-5 text-center text-xs font-black font-mono text-[#072619]"
                        >
                          {cItem.quantity}
                        </motion.span>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(cItem.cart_item_id, 1)}
                          className="w-6 h-6 rounded-md hover:bg-[#cdeeb0]/50 text-[#0f8a5f] flex items-center justify-center transition cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[64px]">
                        <span className="text-xs font-black text-[#072619] font-mono block">
                          {formatLKR(cItem.unit_price * cItem.quantity)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(cItem.cart_item_id)}
                        className="w-6 h-6 rounded-lg hover:bg-rose-50 text-[#4f675a] hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Bottom Cart Financials & High-Contrast Emerald Settle Dock */}
        <div className="p-3.5 border-t border-[#E5ECE8] space-y-2.5 bg-[#f4fbf7]/50">
          {/* Financial Summary */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#4f675a]">
              <span>Sub Total</span>
              <span className="font-bold text-[#072619] font-mono">{formatLKR(subtotal)}</span>
            </div>

            {displayDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-[#0f8a5f]">
                <span className="flex items-center gap-1 font-semibold truncate max-w-[200px]">
                  <Tag className="w-3 h-3 shrink-0" /> {displayDiscountReason || 'Promo Discount'}
                </span>
                <span className="font-bold font-mono shrink-0">-{formatLKR(displayDiscountAmount)}</span>
              </div>
            )}

            {displayCustomerId && displayCustomerLoyaltyPoints > 0 && (
              <div className="p-1.5 rounded-xl bg-[#FEF3E2] border border-[#F59E0B]/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[#072619]">
                  <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="font-bold">Redeem Points</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (displayLoyaltyPointsToRedeem > 0) {
                      setRedeemLoyaltyPoints(0);
                    } else {
                      setRedeemLoyaltyPoints(Math.min(displayCustomerLoyaltyPoints, Math.floor(subtotal)));
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition font-mono cursor-pointer ${
                    displayLoyaltyPointsToRedeem > 0
                      ? 'bg-[#0f8a5f] text-white'
                      : 'bg-white text-[#B45309] border border-[#F59E0B]/40'
                  }`}
                >
                  {displayLoyaltyPointsToRedeem > 0
                    ? `-${formatLKR(displayLoyaltyPointsToRedeem)}`
                    : `Use ${displayCustomerLoyaltyPoints} Pts`}
                </button>
              </div>
            )}

            {displayOrderType === 'dine_in' && (
              <div className="flex items-center justify-between text-[#4f675a]">
                <span>Service Charge (10%)</span>
                <span className="font-bold text-[#072619] font-mono">{formatLKR(serviceCharge)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setManualDiscountInput(displayDiscountAmount > 0 && !displayActivePromoId ? displayDiscountAmount : 0);
                  setManagerPinError(null);
                  setManagerPinInput('');
                  setIsManualDiscountOpen(true);
                }}
                className="text-[11px] font-bold text-[#4f675a] hover:text-[#0f8a5f] flex items-center gap-1 cursor-pointer"
              >
                <Percent className="w-3 h-3" />
                <span>
                  {displayDiscountAmount > 0 && !displayActivePromoId ? 'Edit Discount' : '+ Add Discount'}
                </span>
              </button>

              {displayCartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-[#E5ECE8] flex items-center justify-between">
              <span className="font-display text-sm font-extrabold text-[#072619]">Grand Total</span>
              <span className="font-display text-xl font-black text-[#0f8a5f] font-mono">
                {formatLKR(total)}
              </span>
            </div>
          </div>

          {/* 4 Instant Tender Buttons: Cash, Card, LankaQR, WhatsApp E-Bill */}
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'cash', label: 'Cash', icon: Wallet },
                { id: 'credit_card', label: 'Card', icon: CreditCard },
                { id: 'qr_payment', label: 'LankaQR', icon: QrCode },
                { id: 'whatsapp_ebill', label: 'WA E-Bill', icon: MessageCircle },
              ] as const
            ).map((tender) => {
              const Icon = tender.icon;
              const isSelected = selectedPaymentMethod === tender.id;
              return (
                <button
                  key={tender.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(tender.id)}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition text-[10px] font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-[#072619] border-[#072619] text-[#a3e04f] shadow-sm'
                      : 'bg-white border-[#E5ECE8] text-[#4f675a] hover:text-[#072619] hover:border-[#0f8a5f]/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{tender.label}</span>
                </button>
              );
            })}
          </div>

          {/* High-Contrast Emerald Settle & Print Bill CTA */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              type="button"
              disabled={displayCartItems.length === 0 || isSubmitting}
              onClick={() => handlePlaceOrder()}
              className="w-full h-13 bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-display font-extrabold text-sm rounded-2xl shadow-lg shadow-[#0f8a5f]/25 flex items-center justify-between px-5 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#a3e04f]" />
                <span>{isSubmitting ? 'Settling...' : 'Settle & Print Bill'}</span>
              </span>
              <span className="font-mono font-black text-base text-[#a3e04f]">
                {formatLKR(total)}
              </span>
            </Button>
          </motion.div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* GLOBAL MODALS */}
      {/* ========================================================================= */}
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
        selectedTableId={displayTableId}
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
        customerPhone={successDetails.customerPhone}
        items={successDetails.items}
        onNewOrder={() => {
          setIsPaymentSuccessOpen(false);
          clearCart();
        }}
      />

      <CustomerPickerModal
        isOpen={isCustomerPickerOpen}
        onClose={() => setIsCustomerPickerOpen(false)}
        selectedCustomerId={displayCustomerId}
        onSelectCustomer={(cust) => {
          setCustomerDetails(cust);
          if (cust && cust.loyalty_points > 0) {
            setRedeemLoyaltyPoints(0);
          }
        }}
      />

      {/* Manual Discount with Manager PIN check */}
      <Dialog open={isManualDiscountOpen} onOpenChange={setIsManualDiscountOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-white border-[#E5ECE8] p-6 shadow-2xl">
          <DialogHeader className="pr-10">
            <DialogTitle className="font-display text-xl font-extrabold text-[#072619] flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#0f8a5f]" />
              <span>Manual Order Discount</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4f675a]">
              Apply a fixed-amount promotional or courtesy discount to the cart total.
            </DialogDescription>
          </DialogHeader>

          {managerPinError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{managerPinError}</span>
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label htmlFor="manual-discount-amount" className="font-bold text-[#072619] block mb-1">
                Discount Amount (LKR)
              </label>
              <Input
                id="manual-discount-amount"
                name="manual-discount-amount"
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
              <span className="text-[10px] text-[#4f675a] block mt-1">
                Subtotal: {formatLKR(getSubtotal())} &bull; Max 10% without Manager PIN: {formatLKR(getSubtotal() * 0.1)}
              </span>
            </div>

            <div>
              <label htmlFor="manual-discount-reason" className="font-bold text-[#072619] block mb-1">Reason / Note</label>
              <Input
                id="manual-discount-reason"
                name="manual-discount-reason"
                type="text"
                placeholder="Cashier courtesy, owner guest, VIP discount"
                value={manualDiscountReason}
                onChange={(e) => setManualDiscountReason(e.target.value)}
                className="h-10 rounded-2xl"
              />
            </div>

            {getSubtotal() > 0 && manualDiscountInput / getSubtotal() > 0.10 && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                <label htmlFor="manual-discount-pin" className="font-bold text-red-700 block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Manager Authorization Required (&gt; 10%)</span>
                </label>
                <Input
                  id="manual-discount-pin"
                  name="manual-discount-pin"
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
              className="rounded-2xl border-[#E5ECE8]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyManualDiscount}
              className="rounded-2xl bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-bold"
            >
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
