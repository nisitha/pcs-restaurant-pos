export type ShiftStatus = 'open' | 'closed' | 'audited';

export interface CashShift {
  id: string;
  branch_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_float: number;
  expected_cash: number;
  actual_cash?: number | null;
  cash_variance?: number | null;
  total_sales: number;
  status: ShiftStatus;
  notes?: string | null;
}

export type DrawerActionType = 'cash_in' | 'cash_out' | 'drop';

export interface CashDrawerAction {
  id: string;
  shift_id: string;
  branch_id: string;
  user_id: string;
  action_type: DrawerActionType;
  amount: number;
  reason: string;
  created_at: string;
}
