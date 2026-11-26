export type StockUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export interface Ingredient {
  id: string;
  branch_id: string;
  name: string;
  sku?: string | null;
  unit: StockUnit;
  current_stock: number;
  min_stock_level: number;
  unit_cost: number; // LKR
  category: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: StockUnit;
  ingredient?: Ingredient;
}

export interface Recipe {
  id: string;
  menu_item_id: string;
  variant_id?: string | null;
  yield_quantity: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  menu_item?: {
    id: string;
    name: string;
    base_price: number;
  };
  variant?: {
    id: string;
    variant_name: string;
    price_override?: number | null;
  } | null;
  items?: (RecipeItem & {
    ingredient_name?: string;
    ingredient_unit?: string;
    ingredient_unit_cost?: number;
    subtotal_cost?: number;
  })[];
  total_cost?: number; // Calculated Food Cost (LKR)
  selling_price?: number; // Menu Selling Price (LKR)
  gross_margin_percent?: number; // Calculated Expected Margin %
}

export interface Supplier {
  id: string;
  branch_id: string;
  name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  ingredient_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  ingredient?: Ingredient;
}

export interface PurchaseOrder {
  id: string;
  branch_id: string;
  supplier_id: string;
  po_number: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  total_cost: number;
  created_by: string;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface GoodsReceivedNoteItem {
  id: string;
  grn_id: string;
  ingredient_id: string;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
  ingredient?: Ingredient;
}

export interface GoodsReceivedNote {
  id: string;
  po_id?: string | null;
  branch_id: string;
  supplier_id: string;
  grn_number: string;
  invoice_number?: string | null;
  total_received_amount: number;
  received_by: string;
  received_at: string;
  supplier?: Supplier;
  items?: GoodsReceivedNoteItem[];
}

export interface WastageLog {
  id: string;
  branch_id: string;
  ingredient_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reason: string;
  logged_by: string;
  created_at: string;
  ingredient?: Ingredient;
  user?: {
    display_name: string;
  };
}

export interface StockMovement {
  id: string;
  branch_id: string;
  ingredient_id: string;
  movement_type:
    | 'sale_deduction'
    | 'sale_reversal'
    | 'purchase_grn'
    | 'wastage_spoilage'
    | 'manual_adjustment'
    | 'physical_count';
  quantity: number;
  unit_cost: number;
  reference_order_id?: string | null;
  reference_grn_id?: string | null;
  reference_wastage_id?: string | null;
  idempotent_key: string;
  notes?: string | null;
  created_by: string;
  created_at: string;
  ingredient?: Ingredient;
}
