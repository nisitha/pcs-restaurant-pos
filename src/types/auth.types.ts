export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'waiter'
  | 'chef'
  | 'store_keeper';

export interface StaffUser {
  id: string;
  display_name: string;
  role: UserRole;
  branch_id: string;
  phone?: string;
}

export interface StaffAuthResponse {
  user: StaffUser;
  redirectUrl: string;
}
