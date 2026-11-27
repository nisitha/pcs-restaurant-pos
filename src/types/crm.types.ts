export type CustomerTier = 'Regular' | 'VIP' | 'Corporate';

export interface Customer {
  id: string;
  branch_id: string;
  name: string;
  phone: string;
  email?: string | null;
  delivery_address?: string | null;
  tier: CustomerTier;
  loyalty_points: number;
  total_spent: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  transactions?: LoyaltyTransaction[];
}

export type LoyaltyTxType = 'earned' | 'redeemed' | 'adjusted' | 'bonus' | 'reversal';

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id?: string | null;
  points_change: number;
  transaction_type: LoyaltyTxType;
  notes?: string | null;
  created_at: string;
}

export type PromotionType = 'percentage' | 'fixed_amount' | 'happy_hour' | 'combo_deal';

export interface ComboItem {
  id: string;
  promotion_id: string;
  menu_item_id: string;
  quantity: number;
  menu_item?: {
    id: string;
    name: string;
    base_price: number;
  };
}

export interface Promotion {
  id: string;
  branch_id: string;
  name: string;
  code?: string | null;
  promo_type: PromotionType;
  discount_value: number;
  min_order_amount: number;
  applies_to_category_id?: string | null;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
  days_of_week?: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  } | null;
  combo_items?: ComboItem[];
}
