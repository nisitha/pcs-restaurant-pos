export type OrderSource = 'pos' | 'waiter' | 'table_qr' | 'online_web';

export type DeliveryStatus = 'preparing' | 'ready_for_pickup' | 'dispatched' | 'delivered' | 'cancelled';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  currency: string;
  timezone: string;
  tax_rate: number;
  service_charge_rate: number;
  is_active: boolean;
  created_at?: string;
}

export interface DeliveryRider {
  id: string;
  branch_id: string;
  name: string;
  phone: string;
  vehicle_type: 'bike' | 'scooter' | 'car' | 'van';
  vehicle_plate?: string | null;
  status: 'available' | 'on_delivery' | 'offline';
  is_active: boolean;
  created_at: string;
}

export interface InterBranchTransfer {
  id: string;
  transfer_number: string;
  from_branch_id: string;
  to_branch_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_by: string;
  received_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  from_branch?: Branch;
  to_branch?: Branch;
  items?: InterBranchTransferItem[];
}

export interface InterBranchTransferItem {
  id: string;
  transfer_id: string;
  ingredient_id: string;
  quantity: number;
  unit_cost: number;
  created_at?: string;
  ingredient?: {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
  };
}

export interface OfflineQueuedOrder {
  id: string; // unique local ID or idempotency_key
  idempotency_key: string;
  payload: any;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error_message?: string;
  retry_count: number;
}
