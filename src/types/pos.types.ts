export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface CartItemModifier {
  modifier_id: string;
  modifier_name: string;
  unit_price: number;
}

export interface CartItem {
  cart_item_id: string; // unique client id for keying
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  station_id?: string | null;
  station_code?: string | null;
  station_name?: string | null;
  variant_id?: string | null;
  variant_name?: string | null;
  modifiers: CartItemModifier[];
  notes?: string | null;
  image_url?: string | null;
}

export interface HeldOrder {
  id: string;
  held_at: string;
  order_type: OrderType;
  table_id?: string | null;
  table_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_fee: number;
  discount_amount: number;
  discount_reason?: string | null;
  notes?: string | null;
  items: CartItem[];
  total_amount: number;
}

export interface ActiveOrder {
  id: string;
  order_number: string;
  order_type: OrderType;
  table_id?: string | null;
  table_number?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  cashier_name?: string | null;
  kds_status: 'draft' | 'submitted' | 'in_preparation' | 'partially_ready' | 'ready' | 'served' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'voided';
  subtotal: number;
  discount_amount: number;
  service_charge_amount: number;
  delivery_fee: number;
  total_amount: number;
  paid_amount: number;
  notes?: string | null;
  created_at: string;
  items_count: number;
  stations_routed: string[];
}
