export type StationCode = 'HOT' | 'GRILL' | 'BEV' | 'DESSERT' | string;

export interface KDSTicketItem {
  id: string;
  order_item_id: string;
  item_name: string;
  quantity: number;
  notes?: string | null;
  kds_status: string;
  variant_name?: string | null;
  modifiers: Array<{
    name: string;
    price: number;
  }>;
}

export interface KDSTicket {
  id: string;
  ticket_number: string;
  order_id: string;
  order_number: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  table_id?: string | null;
  table_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  station_id: string;
  station_code: StationCode;
  station_name: string;
  status: 'submitted' | 'in_preparation' | 'ready' | 'served' | 'completed' | 'cancelled';
  started_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  prepared_by_user_id?: string | null;
  prepared_by_name?: string | null;
  order_notes?: string | null;
  items: KDSTicketItem[];
}

export interface TableWaiterView {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  current_order_id?: string | null;
  current_order?: {
    id: string;
    order_number: string;
    kds_status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    notes?: string | null;
    items_count: number;
    station_progress: Array<{
      station_code: string;
      station_name: string;
      status: string;
    }>;
  } | null;
}
