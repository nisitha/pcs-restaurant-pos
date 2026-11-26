export interface KitchenStation {
  id: string;
  branch_id: string;
  code: string; // 'HOT', 'GRILL', 'BEV', 'DESSERT'
  name: string;
  printer_ip?: string | null;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  branch_id: string;
  name: string;
  icon_name?: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ItemVariant {
  id: string;
  menu_item_id: string;
  variant_name: string;
  price_override: number;
  is_default: boolean;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_addition: number;
}

export interface ModifierGroup {
  id: string;
  branch_id: string;
  title: string;
  min_selection: number;
  max_selection: number;
  modifiers?: Modifier[];
}

export interface MenuItem {
  id: string;
  branch_id: string;
  category_id: string;
  default_station_id?: string | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  base_price: number;
  image_url?: string | null;
  is_available: boolean;
  tax_exempt?: boolean;
  display_order?: number;
  variants?: ItemVariant[];
  modifier_groups?: ModifierGroup[];
  station?: KitchenStation | null;
  created_at?: string;
  updated_at?: string;
}

export interface MenuDataPayload {
  version: number;
  updatedAt: string;
  categories: MenuCategory[];
  items: MenuItem[];
  stations: KitchenStation[];
  modifierGroups: ModifierGroup[];
}
