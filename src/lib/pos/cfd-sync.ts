'use client';

import { CartItem, OrderType } from '@/types/pos.types';

export interface CfdLivePayload {
  branchName: string;
  orderType: OrderType;
  tableNumber: string | null;
  customerName: string;
  items: Array<{
    cart_item_id: string;
    item_name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price: number;
    image_url?: string | null;
  }>;
  subtotal: number;
  discountAmount: number;
  loyaltyDiscount: number;
  serviceCharge: number;
  total: number;
  paymentSuccess?: {
    orderNumber: string;
    totalAmount: number;
    paymentMethod: string;
    paymentTime: string;
  } | null;
  updatedAt: number;
}

export const CFD_CHANNEL_NAME = 'pcs_bill_cfd_channel';
export const CFD_STORAGE_KEY = 'pcs_bill_cfd_live_state';

export function broadcastCfdState(payload: CfdLivePayload) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CFD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(CFD_CHANNEL_NAME);
      ch.postMessage(payload);
      ch.close();
    }
  } catch {
    // Ignore BroadcastChannel errors
  }
}

export function readCfdState(): CfdLivePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CFD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CfdLivePayload;
  } catch {
    return null;
  }
}

export function mapCartItemsForCfd(items: CartItem[]): CfdLivePayload['items'] {
  return items.map((i) => ({
    cart_item_id: i.cart_item_id,
    item_name: i.item_name,
    variant_name: i.variant_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    image_url: i.image_url,
  }));
}
