'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { useMenuStore } from '@/stores/menu-store';
import { useCartStore } from '@/stores/cart-store';
import { MenuItem } from '@/types/menu.types';
import { OrderType } from '@/types/pos.types';
import { formatLKR } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OpenShiftDialog } from '@/components/shifts/open-shift-dialog';
import { ItemCustomizerModal } from '@/components/pos/item-customizer-modal';
import { TablePickerModal } from '@/components/pos/table-picker-modal';
import { HoldOrdersModal } from '@/components/pos/hold-orders-modal';
import { OrderSuccessDialog } from '@/components/pos/order-success-dialog';
import {
  Wallet,
  Search,
  Plus,
  Trash2,
  Utensils,
  PauseCircle,
  Play,
  Send,
  Users,
  ShoppingBag,
  Bike,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Clock,
  History,
} from 'lucide-react';

export default function PosBillingPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { activeShift, hasActiveShift, setActiveShift } = useShiftStore();
  const { categories, items, fetchMenu, isLoading: isMenuLoading } = useMenuStore();

  const {
    orderType,
    tableId,
    tableNumber,
    customerName,
    customerPhone,
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
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [selectedItemForCustomizer, setSelectedItemForCustomizer] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [isHoldOrdersOpen, setIsHoldOrdersOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Success response state
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState('');
  const [submittedTotalAmount, setSubmittedTotalAmount] = useState(0);
  const [submittedStationsRouted, setSubmittedStationsRouted] = useState<string[]>([]);

  // Filtering
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Auth & Shift Verification
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login');
      return;
    }

    // Load menu from client cache
    fetchMenu();

    // Check shift
    fetch(`/api/shifts?cashierId=${currentUser.id}&branchId=${currentUser.branch_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.shift) {
          setActiveShift(data.shift);
        }
      });
  }, [isAuthenticated, currentUser, router, fetchMenu, setActiveShift]);

  // Handle clicking an item in the menu catalog
  const handleItemClick = (item: MenuItem) => {
    if (!item.is_available) return;

    const hasOptions =
      (item.variants && item.variants.length > 0) ||
      (item.modifier_groups && item.modifier_groups.length > 0);

    if (hasOptions) {
      setSelectedItemForCustomizer(item);
      setIsCustomizerOpen(true);
    } else {
      // 1-tap fast add
      addItem({
        menu_item_id: item.id,
        item_name: item.name,
        unit_price: Number(item.base_price),
        quantity: 1,
        station_id: item.default_station_id,
        station_name: item.station?.name || 'Hot Kitchen',
        modifiers: [],
        notes: null,
      });
    }
  };

  // Submit Order to Kitchen Stations
  const handleSendToKitchen = async () => {
    setOrderError(null);

    if (cartItems.length === 0) {
      setOrderError('Please add at least one item to the order.');
      return;
    }

    if (orderType === 'dine_in' && !tableId) {
      setOrderError('Please assign a Dining Table for Dine-In orders.');
      setIsTablePickerOpen(true);
      return;
    }

    if (!currentUser || !activeShift) {
      setOrderError('Active staff login and cash shift are required.');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const idempotencyKey = crypto.randomUUID();

      const payload = {
        branchId: currentUser.branch_id,
        cashierId: currentUser.id,
        shiftId: activeShift.id,
        orderType,
        tableId: tableId || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryFee,
        discountAmount,
        discountReason: discountReason || undefined,
        notes: orderNotes.trim() || undefined,
        idempotencyKey,
        items: cartItems.map((item) => ({
          menu_item_id: item.menu_item_id,
          variant_id: item.variant_id || null,
          item_name: item.item_name + (item.variant_name ? ` (${item.variant_name})` : ''),
          unit_price: item.unit_price,
          quantity: item.quantity,
          station_id: item.station_id || null,
          station_name: item.station_name || 'Kitchen',
          notes: item.notes || null,
          modifiers: item.modifiers || [],
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit order.');
      }

      setSubmittedOrderNumber(data.orderNumber);
      setSubmittedTotalAmount(data.totalAmount);
      setSubmittedStationsRouted(data.stationsRouted || ['Kitchen']);
      setIsSuccessModalOpen(true);

      // Reset cart cleanly
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting order';
      setOrderError(msg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Shift Gatekeeper
  if (!hasActiveShift || !activeShift) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Cash Shift Required</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Cashier counter billing requires an active shift with an opening float before orders can be placed.
          </p>
          <Button
            size="lg"
            onClick={() => setIsOpenShiftModalOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Wallet className="w-5 h-5" />
            <span>Open Shift with Cash Float</span>
          </Button>

          <OpenShiftDialog
            isOpen={isOpenShiftModalOpen}
            onOpenChange={setIsOpenShiftModalOpen}
            onSuccess={() => setIsOpenShiftModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const subtotal = getSubtotal();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-zinc-950 text-white">
      {/* ==================================================================== */}
      {/* LEFT / CENTER PANEL: Menu Catalog & Categories */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col border-r border-zinc-800 overflow-hidden">
        {/* Top Search & Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedCategoryId('all')}
              className={`text-xs rounded-xl h-9 whitespace-nowrap font-bold ${
                selectedCategoryId === 'all'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              All Items ({items.length})
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCategoryId(c.id)}
                className={`text-xs rounded-xl h-9 whitespace-nowrap font-bold ${
                  selectedCategoryId === c.id
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {c.name}
              </Button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filteredItems.map((item) => {
            const hasVariants = item.variants && item.variants.length > 0;

            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.is_available}
                onClick={() => handleItemClick(item)}
                className={`relative p-3.5 rounded-2xl border text-left transition flex flex-col justify-between h-36 ${
                  item.is_available
                    ? 'bg-zinc-900/90 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850 active:scale-[0.98]'
                    : 'bg-zinc-950/80 border-rose-500/20 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
                      {item.station?.code || 'HOT'}
                    </span>
                    {hasVariants && (
                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Sizes
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-white line-clamp-2 leading-tight">
                    {item.name}
                  </h4>
                </div>

                <div className="flex items-end justify-between pt-2">
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {formatLKR(item.base_price)}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                {/* 86 Unavailable Badge */}
                {!item.is_available && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-rose-600 text-white tracking-wider">
                      86 Out of Stock
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT PANEL: POS Order Cart & Summary */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-[420px] flex flex-col bg-zinc-900/95 border-l border-zinc-800 shrink-0 overflow-hidden">
        {/* Order Type Header */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-2.5">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                orderType === 'dine_in'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderType('takeaway')}
              className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                orderType === 'takeaway'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderType('delivery')}
              className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                orderType === 'delivery'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Context Details (Table / Customer) */}
          {orderType === 'dine_in' && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">Assigned Table:</span>
                <span className="text-sm font-black text-white">
                  {tableNumber ? `Table ${tableNumber}` : 'None Selected'}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTablePickerOpen(true)}
                className="h-7 text-xs bg-zinc-900 border-zinc-700 text-amber-400 hover:text-white"
              >
                {tableNumber ? 'Change' : 'Pick Table'}
              </Button>
            </div>
          )}

          {orderType === 'takeaway' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomer(e.target.value, customerPhone)}
                className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs"
              />
              <Input
                placeholder="Phone (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomer(customerName, e.target.value)}
                className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs font-mono"
              />
            </div>
          )}

          {orderType === 'delivery' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomer(e.target.value, customerPhone, deliveryAddress)}
                  className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs"
                />
                <Input
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomer(customerName, e.target.value, deliveryAddress)}
                  className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs font-mono"
                />
              </div>
              <Input
                placeholder="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => setCustomer(customerName, customerPhone, e.target.value)}
                className="h-8 bg-zinc-950 border-zinc-800 text-white text-xs"
              />
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-zinc-400">Your cart is empty</p>
              <p className="text-xs text-zinc-500 mt-0.5">Tap menu items to ring up an order.</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemTotal =
                (item.unit_price + (item.modifiers || []).reduce((s, m) => s + m.unit_price, 0)) *
                item.quantity;

              return (
                <div
                  key={item.cart_item_id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-bold text-xs text-white leading-tight block">
                        {item.item_name}
                      </span>
                      {item.variant_name && (
                        <span className="text-[10px] text-amber-400/90 font-mono">
                          {item.variant_name}
                        </span>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-[10px] text-zinc-400">
                          {item.modifiers.map((m) => m.modifier_name).join(', ')}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-zinc-500 italic mt-0.5">&ldquo;{item.notes}&rdquo;</p>
                      )}
                    </div>

                    <span className="font-mono font-bold text-xs text-amber-400 whitespace-nowrap">
                      {formatLKR(itemTotal)}
                    </span>
                  </div>

                  {/* Quantity Stepper & Remove */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.cart_item_id, -1)}
                        className="w-6 h-6 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 font-bold text-xs"
                      >
                        -
                      </Button>
                      <span className="font-mono font-bold text-xs text-white min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.cart_item_id, 1)}
                        className="w-6 h-6 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 font-bold text-xs"
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.cart_item_id)}
                      className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pricing Summary & Send to Kitchen */}
        <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 space-y-3 shrink-0">
          {orderError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{orderError}</span>
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>
              <span className="text-white font-mono">{formatLKR(subtotal)}</span>
            </div>
            {orderType === 'dine_in' && (
              <div className="flex justify-between text-zinc-400">
                <span>Service Charge (10%):</span>
                <span className="text-white font-mono">{formatLKR(serviceCharge)}</span>
              </div>
            )}
            {orderType === 'delivery' && (
              <div className="flex justify-between text-zinc-400">
                <span>Delivery Fee:</span>
                <span className="text-white font-mono">{formatLKR(deliveryFee)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount Applied:</span>
                <span className="font-mono">-{formatLKR(discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-zinc-800 pt-1.5 flex justify-between items-center">
              <span className="font-bold text-sm text-white">Final Total:</span>
              <span className="font-black text-xl text-amber-400 font-mono">
                {formatLKR(total)}
              </span>
            </div>
          </div>

          {/* Hold & Actions Toolbar */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cartItems.length === 0}
              onClick={() => {
                const held = holdCurrentOrder();
                if (held) {
                  // success hold
                }
              }}
              className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5 h-9"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hold Order</span>
            </Button>

            {heldOrders.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHoldOrdersOpen(true)}
                className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold h-9 gap-1"
              >
                <span>Held ({heldOrders.length})</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={cartItems.length === 0}
              onClick={clearCart}
              className="text-zinc-500 hover:text-rose-400 h-9 px-2.5 text-xs"
            >
              Clear
            </Button>
          </div>

          {/* Send to Kitchen Button */}
          <Button
            size="lg"
            disabled={cartItems.length === 0 || isSubmittingOrder}
            onClick={handleSendToKitchen}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold h-13 rounded-xl gap-2 shadow-lg shadow-emerald-600/20 text-base"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmittingOrder ? 'Routing to Stations...' : `Send to Kitchen (${formatLKR(total)})`}</span>
          </Button>
        </div>
      </div>

      {/* Global Modals */}
      <ItemCustomizerModal
        isOpen={isCustomizerOpen}
        onOpenChange={setIsCustomizerOpen}
        item={selectedItemForCustomizer}
        onAddToCart={addItem}
      />

      <TablePickerModal
        isOpen={isTablePickerOpen}
        onOpenChange={setIsTablePickerOpen}
        selectedTableId={tableId}
        onSelectTable={(id, num) => setTable(id, num)}
      />

      <HoldOrdersModal
        isOpen={isHoldOrdersOpen}
        onOpenChange={setIsHoldOrdersOpen}
      />

      <OrderSuccessDialog
        isOpen={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        orderNumber={submittedOrderNumber}
        totalAmount={submittedTotalAmount}
        stationsRouted={submittedStationsRouted}
        onNewOrder={() => {
          clearCart();
        }}
      />
    </div>
  );
}
