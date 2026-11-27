'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, OrderType, HeldOrder } from '@/types/pos.types';

interface CartState {
  orderType: OrderType;
  tableId: string | null;
  tableNumber: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerTier: string | null;
  customerLoyaltyPoints: number;
  loyaltyPointsToRedeem: number;
  activePromoId: string | null;
  activePromoName: string | null;
  deliveryAddress: string;
  deliveryFee: number;
  discountAmount: number;
  discountReason: string;
  orderNotes: string;
  items: CartItem[];
  heldOrders: HeldOrder[];

  // Actions
  setOrderType: (type: OrderType) => void;
  setTable: (tableId: string | null, tableNumber: string | null) => void;
  setCustomer: (name: string, phone: string, address?: string) => void;
  setCustomerDetails: (customer: { id: string; name: string; phone: string; tier?: string; loyalty_points?: number; delivery_address?: string | null } | null) => void;
  setRedeemLoyaltyPoints: (points: number) => void;
  setActivePromotion: (promoId: string | null, promoName: string | null, discount: number) => void;
  setDeliveryFee: (fee: number) => void;
  setDiscount: (amount: number, reason?: string) => void;
  setOrderNotes: (notes: string) => void;
  addItem: (item: Omit<CartItem, 'cart_item_id'>) => void;
  updateItemQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  holdCurrentOrder: () => boolean;
  resumeOrder: (heldOrderId: string) => boolean;
  deleteHeldOrder: (heldOrderId: string) => void;

  // Calculators
  getSubtotal: () => number;
  getServiceCharge: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      orderType: 'dine_in',
      tableId: null,
      tableNumber: null,
      customerId: null,
      customerName: '',
      customerPhone: '',
      customerTier: null,
      customerLoyaltyPoints: 0,
      loyaltyPointsToRedeem: 0,
      activePromoId: null,
      activePromoName: null,
      deliveryAddress: '',
      deliveryFee: 0,
      discountAmount: 0,
      discountReason: '',
      orderNotes: '',
      items: [],
      heldOrders: [],

      setOrderType: (type: OrderType) => {
        set({ orderType: type });
      },

      setTable: (tableId, tableNumber) => {
        set({ tableId, tableNumber });
      },

      setCustomer: (name, phone, address = '') => {
        set({
          customerName: name,
          customerPhone: phone,
          deliveryAddress: address,
        });
      },

      setCustomerDetails: (customer) => {
        if (!customer) {
          set({
            customerId: null,
            customerName: '',
            customerPhone: '',
            customerTier: null,
            customerLoyaltyPoints: 0,
            loyaltyPointsToRedeem: 0,
          });
        } else {
          set({
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerTier: customer.tier || 'Regular',
            customerLoyaltyPoints: customer.loyalty_points || 0,
            deliveryAddress: customer.delivery_address || '',
          });
        }
      },

      setRedeemLoyaltyPoints: (points) => {
        set({ loyaltyPointsToRedeem: Math.max(0, points) });
      },

      setActivePromotion: (promoId, promoName, discount) => {
        set({
          activePromoId: promoId,
          activePromoName: promoName,
          discountAmount: Math.max(0, discount),
          discountReason: promoName || '',
        });
      },

      setDeliveryFee: (fee) => {
        set({ deliveryFee: Math.max(0, fee) });
      },

      setDiscount: (amount, reason = '') => {
        set({
          discountAmount: Math.max(0, amount),
          discountReason: reason,
        });
      },

      setOrderNotes: (notes) => {
        set({ orderNotes: notes });
      },

      addItem: (itemData) => {
        const items = get().items;

        // Check if an identical item (same menu_item_id, same variant, same modifiers, same notes) exists
        const modifiersKey = (itemData.modifiers || [])
          .map((m) => m.modifier_id)
          .sort()
          .join(',');

        const existingIndex = items.findIndex((i) => {
          const itemModsKey = (i.modifiers || [])
            .map((m) => m.modifier_id)
            .sort()
            .join(',');
          return (
            i.menu_item_id === itemData.menu_item_id &&
            i.variant_id === itemData.variant_id &&
            itemModsKey === modifiersKey &&
            (i.notes || '') === (itemData.notes || '')
          );
        });

        if (existingIndex > -1) {
          const updated = [...items];
          updated[existingIndex].quantity += itemData.quantity || 1;
          set({ items: updated });
        } else {
          const newItem: CartItem = {
            ...itemData,
            cart_item_id: crypto.randomUUID(),
            quantity: itemData.quantity || 1,
          };
          set({ items: [...items, newItem] });
        }
      },

      updateItemQuantity: (cartItemId, delta) => {
        const items = get().items;
        const updated = items
          .map((item) => {
            if (item.cart_item_id === cartItemId) {
              const nextQty = item.quantity + delta;
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];

        set({ items: updated });
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter((i) => i.cart_item_id !== cartItemId) });
      },

      updateItemNotes: (cartItemId, notes) => {
        set({
          items: get().items.map((i) =>
            i.cart_item_id === cartItemId ? { ...i, notes } : i
          ),
        });
      },

      clearCart: () => {
        set({
          tableId: null,
          tableNumber: null,
          customerId: null,
          customerName: '',
          customerPhone: '',
          customerTier: null,
          customerLoyaltyPoints: 0,
          loyaltyPointsToRedeem: 0,
          activePromoId: null,
          activePromoName: null,
          deliveryAddress: '',
          deliveryFee: 0,
          discountAmount: 0,
          discountReason: '',
          orderNotes: '',
          items: [],
        });
      },

      holdCurrentOrder: () => {
        const state = get();
        if (state.items.length === 0) return false;

        const held: HeldOrder = {
          id: crypto.randomUUID(),
          held_at: new Date().toISOString(),
          order_type: state.orderType,
          table_id: state.tableId,
          table_number: state.tableNumber,
          customer_name: state.customerName,
          customer_phone: state.customerPhone,
          delivery_address: state.deliveryAddress,
          delivery_fee: state.deliveryFee,
          discount_amount: state.discountAmount,
          discount_reason: state.discountReason,
          notes: state.orderNotes,
          items: state.items,
          total_amount: state.getTotal(),
        };

        set({
          heldOrders: [held, ...state.heldOrders],
        });

        get().clearCart();
        return true;
      },

      resumeOrder: (heldOrderId) => {
        const target = get().heldOrders.find((h) => h.id === heldOrderId);
        if (!target) return false;

        set({
          orderType: target.order_type,
          tableId: target.table_id || null,
          tableNumber: target.table_number || null,
          customerName: target.customer_name || '',
          customerPhone: target.customer_phone || '',
          deliveryAddress: target.delivery_address || '',
          deliveryFee: target.delivery_fee || 0,
          discountAmount: target.discount_amount || 0,
          discountReason: target.discount_reason || '',
          orderNotes: target.notes || '',
          items: target.items,
          heldOrders: get().heldOrders.filter((h) => h.id !== heldOrderId),
        });

        return true;
      },

      deleteHeldOrder: (heldOrderId) => {
        set({
          heldOrders: get().heldOrders.filter((h) => h.id !== heldOrderId),
        });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const modTotal = (item.modifiers || []).reduce((mSum, m) => mSum + m.unit_price, 0);
          return sum + (item.unit_price + modTotal) * item.quantity;
        }, 0);
      },

      getServiceCharge: () => {
        const { orderType } = get();
        if (orderType !== 'dine_in') return 0;
        const subtotal = get().getSubtotal();
        return Number((subtotal * 0.1).toFixed(2)); // 10% on Dine-in
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const serviceCharge = get().getServiceCharge();
        const { deliveryFee, discountAmount, loyaltyPointsToRedeem } = get();
        const total = subtotal - discountAmount - (loyaltyPointsToRedeem || 0) + serviceCharge + deliveryFee;
        return Number(Math.max(0, total).toFixed(2));
      },
    }),
    {
      name: 'pcs-pos-cart-session',
    }
  )
);
