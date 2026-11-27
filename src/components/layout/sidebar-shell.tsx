'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  ChefHat,
  Smartphone,
  ClipboardList,
  Layers,
  LayoutDashboard,
  Utensils,
  LogOut,
  Lock,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  Grid3X3,
  CalendarCheck,
  Truck,
  Wallet,
  Settings,
  Scale,
  Boxes,
  Users,
  Tag,
  BarChart3,
  Building2,
  Bike,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOfflineSync } from '@/lib/offline/sync-queue';
import { OpenShiftDialog } from '@/components/shifts/open-shift-dialog';
import { CashDrawerDialog } from '@/components/shifts/cash-drawer-dialog';
import { CloseShiftDialog } from '@/components/shifts/close-shift-dialog';
import { formatLKR } from '@/lib/utils/currency';

interface SidebarShellProps {
  children: React.ReactNode;
}

export function AppSidebarShell({ children }: SidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuthStore();
  const { activeShift, hasActiveShift } = useShiftStore();
  const { branches, activeBranchId, activeBranch, setActiveBranchId } = useBranchStore();
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isDrawerActionOpen, setIsDrawerActionOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);

  // If on login page or customer self-ordering pages, render children cleanly without staff sidebar
  if (pathname === '/login' || pathname.startsWith('/order')) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/pos', label: 'Menu', icon: UtensilsCrossed, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
    { href: '/tables', label: 'Table Services', icon: Grid3X3, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
    { href: '/kds', label: 'Kitchen KDS', icon: ChefHat, roles: ['chef', 'manager', 'owner', 'super_admin'] },
    { href: '/waiter', label: 'Waiter Panel', icon: Smartphone, roles: ['waiter', 'manager', 'owner', 'super_admin'] },
    { href: '/orders', label: 'Orders & Delivery', icon: ClipboardList, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
    { href: '/shifts', label: 'Accounting & Shifts', icon: Layers, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
    { href: '/admin/dashboard', label: 'Analytics', icon: LayoutDashboard, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/recipes', label: 'Recipes (BOM)', icon: Scale, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/inventory', label: 'Inventory & Stock', icon: Boxes, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/purchasing', label: 'Purchasing & GRN', icon: Truck, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/customers', label: 'Customers & CRM', icon: Users, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
    { href: '/admin/delivery', label: 'Delivery Dispatch', icon: Bike, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
    { href: '/admin/branches', label: 'Branches & Transfers', icon: Building2, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/promotions', label: 'Promotions & Combos', icon: Tag, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/reports', label: 'BI Reports', icon: BarChart3, roles: ['manager', 'owner', 'super_admin'] },
    { href: '/admin/menu', label: 'Menu Settings', icon: Settings, roles: ['manager', 'owner', 'super_admin'] },
  ];

  // Helper for initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F6F7F9]">
      {/* Left Navigation Sidebar */}
      <aside
        className={`h-full bg-white border-r border-[#EBECEF] flex flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#F4F5F7]">
          <Link href="/pos" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center shrink-0 shadow-sm font-black border border-[#BDE8CB]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight flex-1 min-w-0 pr-1">
                <span className="font-extrabold text-base tracking-tight text-[#1A1D1F] block">
                  PCS POS
                </span>
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="text-[10px] text-[#119C49] font-bold tracking-wide bg-transparent border-0 p-0 focus:outline-none cursor-pointer truncate max-w-32"
                  title="Switch Active Branch"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="text-[#1A1D1F] bg-white font-sans text-xs">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Link>

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F7] text-[#7C828D] hover:text-[#1A1D1F] flex items-center justify-center transition"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Stadium Pill Navigation Links */}
        <nav className="p-3 flex-1 space-y-1.5 overflow-y-auto scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/pos' && pathname.startsWith(`${link.href}/`));
            const isPermitted = !currentUser || link.roles.includes(currentUser.role);

            if (!isPermitted) return null;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#119C49] text-white shadow-md shadow-[#119C49]/20'
                    : 'text-[#7C828D] hover:bg-[#F4F5F7] hover:text-[#1A1D1F]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={link.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#7C828D]'}`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Staff Profile Chip + Shift Action + Logout */}
        <div className="p-3 border-t border-[#F4F5F7] space-y-2 bg-[#FCFCFD]">
          {/* Network & Offline Order Queue Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${
              !isOnline
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : pendingCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-[#D1F0DC]/40 border-[#BDE8CB] text-[#119C49]'
            } ${isCollapsed ? 'justify-center p-1.5' : 'justify-between'}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`w-2 h-2 rounded-full ${
                  !isOnline || pendingCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-[#119C49]'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate">
                  {!isOnline ? 'Offline Mode' : pendingCount > 0 ? `${pendingCount} Queued` : 'Online'}
                </span>
              )}
            </div>
            {!isCollapsed && pendingCount > 0 && isOnline && (
              <button
                type="button"
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-[#119C49] text-white hover:bg-[#0E823D] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            )}
          </div>
          {/* Active Shift Status Pill */}
          {currentUser && (currentUser.role === 'cashier' || currentUser.role === 'manager' || currentUser.role === 'owner') && (
            <div>
              {hasActiveShift && activeShift ? (
                <button
                  type="button"
                  onClick={() => setIsDrawerActionOpen(true)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl bg-[#D1F0DC]/50 border border-[#BDE8CB] hover:bg-[#D1F0DC] transition text-left ${
                    isCollapsed ? 'justify-center p-2' : ''
                  }`}
                  title={`Shift Open: ${formatLKR(activeShift.expected_cash)}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#119C49] animate-pulse shrink-0" />
                  {!isCollapsed && (
                    <div className="overflow-hidden leading-tight">
                      <p className="text-[10px] text-[#119C49] font-bold uppercase tracking-wider">Shift Open</p>
                      <p className="text-xs font-extrabold text-[#1A1D1F] truncate font-mono">
                        {formatLKR(activeShift.expected_cash)}
                      </p>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOpenShiftOpen(true)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl bg-[#FEF3E2] border border-[#FDE3B8] hover:bg-[#FDE3B8] transition text-left ${
                    isCollapsed ? 'justify-center p-2' : ''
                  }`}
                  title="Open Cashier Shift"
                >
                  <Wallet className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  {!isCollapsed && (
                    <span className="text-xs font-bold text-[#F59E0B]">Open Shift</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Active Staff User Chip */}
          {currentUser ? (
            <div
              className={`flex items-center gap-2.5 p-1.5 rounded-full bg-[#F4F5F7] border border-[#EBECEF] cursor-pointer hover:bg-[#EBECEF] transition ${
                isCollapsed ? 'justify-center' : ''
              }`}
              onClick={handleLogout}
              title="Click to Switch Staff / Lock"
            >
              <div className="w-7 h-7 rounded-full bg-[#D1F0DC] text-[#119C49] font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-[#BDE8CB]">
                {getInitials(currentUser.display_name)}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 leading-tight">
                  <p className="text-xs font-bold text-[#1A1D1F] truncate">{currentUser.display_name}</p>
                  <p className="text-[10px] text-[#7C828D] capitalize">{currentUser.role}</p>
                </div>
              )}
              {!isCollapsed && <Lock className="w-3.5 h-3.5 text-[#7C828D] mr-1" />}
            </div>
          ) : (
            <Link
              href="/login"
              className={`flex items-center gap-2 p-2 rounded-full bg-[#119C49] text-white font-bold text-xs justify-center transition hover:bg-[#0E853E] ${
                isCollapsed ? 'p-2' : ''
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {!isCollapsed && <span>PIN Login</span>}
            </Link>
          )}

          {/* Logout Button */}
          {currentUser && (
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#7C828D] hover:text-rose-600 hover:bg-rose-50 rounded-full transition ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F6F7F9]">
        {children}
      </div>

      {/* Global Cash Shift Dialogs */}
      <OpenShiftDialog isOpen={isOpenShiftOpen} onOpenChange={setIsOpenShiftOpen} />
      <CashDrawerDialog isOpen={isDrawerActionOpen} onOpenChange={setIsDrawerActionOpen} />
      <CloseShiftDialog isOpen={isCloseShiftOpen} onOpenChange={setIsCloseShiftOpen} />
    </div>
  );
}
