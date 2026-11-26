export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface RestaurantFloor {
  id: string;
  branch_id: string;
  name: string;
  display_order: number;
}

export interface DiningTable {
  id: string;
  branch_id: string;
  floor_id: string;
  table_number: string;
  seating_capacity: number;
  status: TableStatus;
  current_order_id?: string | null;
  pos_x: number;
  pos_y: number;
  is_active: boolean;
  dining_started_at?: string | null;
  order_number?: string | null;
  order_amount?: number | null;
  updated_at?: string;
}
