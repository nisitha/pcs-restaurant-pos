'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  ChefHat,
  Smartphone,
  ClipboardList,
  Layers,
  LayoutDashboard,
  LogOut,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  Truck,
  Settings,
  Scale,
  Boxes,
  Users,
  Tag,
  BarChart3,
  Building2,
  Bike,
  RefreshCw,
  Wallet,
  Focus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useShiftStore } from '@/stores/shift-store';
import { useBranchStore } from '@/stores/branch-store';
import { useOfflineSync } from '@/lib/offline/sync-queue';
import { OpenShiftDialog } from '@/components/shifts/open-shift-dialog';
import { CashDrawerDialog } from '@/components/shifts/cash-drawer-dialog';
import { CloseShiftDialog } from '@/components/shifts/close-shift-dialog';
import { formatLKR } from '@/lib/utils/currency';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarShellProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'front-of-house',
    title: 'Front of House',
    items: [
      { href: '/pos', label: 'Counter POS', icon: UtensilsCrossed, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
      { href: '/orders', label: 'Orders & Bills', icon: ClipboardList, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
      { href: '/admin/delivery', label: 'Delivery Dispatch', icon: Bike, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
      { href: '/shifts', label: 'Shifts & Cash', icon: Layers, roles: ['cashier', 'manager', 'owner', 'super_admin'] },
    ],
  },
  {
    id: 'kitchen-floor',
    title: 'Kitchen & Floor',
    items: [
      { href: '/tables', label: 'Table Services', icon: Grid3X3, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
      { href: '/waiter', label: 'Waiter Panel', icon: Smartphone, roles: ['waiter', 'manager', 'owner', 'super_admin'] },
      { href: '/kds', label: 'Kitchen KDS', icon: ChefHat, roles: ['chef', 'manager', 'owner', 'super_admin'] },
    ],
  },
  {
    id: 'inventory-cost',
    title: 'Inventory & Cost',
    items: [
      { href: '/admin/inventory', label: 'Inventory & Stock', icon: Boxes, roles: ['manager', 'owner', 'super_admin'] },
      { href: '/admin/recipes', label: 'Recipes (BOM)', icon: Scale, roles: ['manager', 'owner', 'super_admin'] },
      { href: '/admin/purchasing', label: 'Purchasing & GRN', icon: Truck, roles: ['manager', 'owner', 'super_admin'] },
    ],
  },
  {
    id: 'crm-growth',
    title: 'CRM & Growth',
    items: [
      { href: '/admin/customers', label: 'Customers & CRM', icon: Users, roles: ['cashier', 'waiter', 'manager', 'owner', 'super_admin'] },
      { href: '/admin/promotions', label: 'Promotions & Combos', icon: Tag, roles: ['manager', 'owner', 'super_admin'] },
    ],
  },
  {
    id: 'reports-settings',
    title: 'Reports & Settings',
    items: [
      { href: '/admin/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, roles: ['manager', 'owner', 'super_admin'] },
      { href: '/admin/reports', label: 'BI Reports', icon: BarChart3, roles: ['manager', 'owner', 'super_admin'] },
      { href: '/admin/branches', label: 'Branches & Transfers', icon: Building2, roles: ['manager', 'owner', 'super_admin'] },
      { href: '/admin/menu', label: 'Menu Settings', icon: Settings, roles: ['manager', 'owner', 'super_admin'] },
    ],
  },
];

export function AppSidebarShell({ children }: SidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuthStore();
  const { activeShift, hasActiveShift } = useShiftStore();
  const { branches, activeBranchId, setActiveBranchId } = useBranchStore();
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  const [focusPosMode, setFocusPosMode] = useState<boolean>(false);
  const [hasManualOverride, setHasManualOverride] = useState<boolean>(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'front-of-house': true,
    'kitchen-floor': true,
    'inventory-cost': false,
    'crm-growth': false,
    'reports-settings': true,
  });

  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isDrawerActionOpen, setIsDrawerActionOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);

  // Auto-enable Focus POS Mode (64px slim icon rail) by default for Cashiers
  useEffect(() => {
    if (!hasManualOverride && currentUser?.role === 'cashier') {
      setFocusPosMode(true);
    } else if (!hasManualOverride && currentUser && currentUser.role !== 'cashier') {
      setFocusPosMode(false);
    }
  }, [currentUser, hasManualOverride]);

  // Ensure the group containing the active route is expanded when sidebar is open
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) =>
      group.items.some(
        (link) => pathname === link.href || (link.href !== '/pos' && pathname.startsWith(`${link.href}/`))
      )
    );
    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [pathname]);

  // If on login page or customer self-ordering pages, render children cleanly without staff sidebar
  if (pathname === '/login' || pathname.startsWith('/order')) {
    return <>{children}</>;
  }

  const handleToggleFocusMode = () => {
    setHasManualOverride(true);
    setFocusPosMode((prev) => !prev);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleLogout = () => {
    setHasManualOverride(false);
    logout();
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isCollapsed = focusPosMode;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4fbf7]">
      {/* Left Navigation Sidebar (64px slim rail in Focus POS Mode, 248px expanded) */}
      <aside
        className={`h-full bg-white border-r border-[#E5ECE8] flex flex-col justify-between transition-all duration-200 z-30 shrink-0 shadow-xs ${
          isCollapsed ? 'w-16' : 'w-[248px]'
        }`}
      >
        {/* Top: PCS Bill OS Brand Header & Focus POS Toggle */}
        <div className={`p-3 flex items-center border-b border-[#E5ECE8] ${isCollapsed ? 'flex-col gap-2 py-3' : 'justify-between'}`}>
          <Link href="/pos" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#072619] text-[#a3e04f] flex items-center justify-center shrink-0 shadow-sm border border-[#0f8a5f]/30">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight flex-1 min-w-0 pr-1">
                <span className="font-display font-extrabold text-sm tracking-tight text-[#072619] block">
                  PCS Bill <span className="text-[#0f8a5f]">OS</span>
                </span>
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="text-[10px] text-[#0f8a5f] font-bold tracking-wide bg-transparent border-0 p-0 focus:outline-none cursor-pointer truncate max-w-32"
                  title="Switch Active Branch"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="text-[#072619] bg-white font-sans text-xs">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Link>

          {/* Focus POS Mode / Collapse Rail Toggle */}
          <button
            type="button"
            onClick={handleToggleFocusMode}
            className={`h-8 rounded-xl flex items-center justify-center transition gap-1 cursor-pointer ${
              isCollapsed
                ? 'w-9 bg-[#cdeeb0]/60 text-[#072619] hover:bg-[#cdeeb0]'
                : 'px-2 bg-[#f4fbf7] border border-[#E5ECE8] text-[#4f675a] hover:text-[#072619] hover:bg-[#cdeeb0]/40'
            }`}
            title={isCollapsed ? 'Exit Focus POS Mode (Expand Sidebar)' : 'Enable Focus POS Mode (64px Rail)'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <Focus className="w-3.5 h-3.5 text-[#0f8a5f]" />
                <span className="text-[10px] font-bold">Focus</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Center: Collapsible Sectioned Navigation */}
        <nav className={`flex-1 overflow-y-auto scrollbar-none ${isCollapsed ? 'p-2 space-y-1.5' : 'p-2.5 space-y-2.5'}`}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (link) => !currentUser || link.roles.includes(currentUser.role)
            );
            if (visibleItems.length === 0) return null;

            const isGroupOpen = openGroups[group.id] ?? true;

            if (isCollapsed) {
              // In 64px Focus Rail Mode, render crisp centered icon buttons with subtle group dividers
              return (
                <div key={group.id} className="space-y-1 pb-1.5 border-b border-[#E5ECE8]/70 last:border-b-0">
                  {visibleItems.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                      pathname === link.href || (link.href !== '/pos' && pathname.startsWith(`${link.href}/`));

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        title={link.label}
                        className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-[#4f675a] hover:bg-[#f4fbf7] hover:text-[#072619]'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-sidebar-pill"
                            className="absolute inset-0 bg-[#0f8a5f] rounded-xl shadow-md shadow-[#0f8a5f]/25"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          />
                        )}
                        <Icon className={`relative z-10 w-4 h-4 shrink-0 ${isActive ? 'text-[#a3e04f]' : ''}`} />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            // Expanded Mode: Clean Collapsible Sections
            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#4f675a]/80 hover:text-[#072619] transition"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isGroupOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isGroupOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.16 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {visibleItems.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                          pathname === link.href || (link.href !== '/pos' && pathname.startsWith(`${link.href}/`));

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              isActive
                                ? 'text-white'
                                : 'text-[#4f675a] hover:bg-[#f4fbf7] hover:text-[#072619]'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-sidebar-pill"
                                className="absolute inset-0 bg-[#0f8a5f] rounded-xl shadow-sm shadow-[#0f8a5f]/20"
                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                              />
                            )}
                            <Icon
                              className={`relative z-10 w-4 h-4 shrink-0 ${
                                isActive ? 'text-[#a3e04f]' : 'text-[#4f675a]'
                              }`}
                            />
                            <span className="relative z-10 truncate">{link.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Bottom: Sync Status, Active Shift, Staff Profile & Logout */}
        <div className={`border-t border-[#E5ECE8] space-y-2 bg-[#f4fbf7]/60 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {/* Network & Offline Order Queue Status */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border text-[11px] font-bold ${
              !isOnline || pendingCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-[#cdeeb0]/40 border-[#0f8a5f]/20 text-[#0f8a5f]'
            } ${isCollapsed ? 'justify-center p-2' : 'px-2.5 py-1.5 justify-between'}`}
            title={!isOnline ? 'Offline Mode' : pendingCount > 0 ? `${pendingCount} Queued` : 'Online — Synced'}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  !isOnline || pendingCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-[#0f8a5f]'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate">
                  {!isOnline ? 'Offline Mode' : pendingCount > 0 ? `${pendingCount} Queued` : 'System Online'}
                </span>
              )}
            </div>
            {!isCollapsed && pendingCount > 0 && isOnline && (
              <button
                type="button"
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-[#0f8a5f] text-white hover:bg-[#0b6f4c] flex items-center gap-1 cursor-pointer"
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
                  className={`w-full flex items-center gap-2 rounded-xl bg-white border border-[#0f8a5f]/25 hover:border-[#0f8a5f] transition text-left shadow-2xs ${
                    isCollapsed ? 'justify-center p-2' : 'p-2'
                  }`}
                  title={`Shift Open: ${formatLKR(activeShift.expected_cash)}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f8a5f] animate-pulse shrink-0" />
                  {!isCollapsed && (
                    <div className="overflow-hidden leading-tight">
                      <p className="text-[10px] text-[#0f8a5f] font-bold uppercase tracking-wider">Shift Open</p>
                      <p className="text-xs font-extrabold text-[#072619] truncate font-mono">
                        {formatLKR(activeShift.expected_cash)}
                      </p>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOpenShiftOpen(true)}
                  className={`w-full flex items-center gap-2 rounded-xl bg-[#FEF3E2] border border-[#FDE3B8] hover:bg-[#FDE3B8] transition text-left ${
                    isCollapsed ? 'justify-center p-2' : 'p-2'
                  }`}
                  title="Open Cashier Shift"
                >
                  <Wallet className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  {!isCollapsed && (
                    <span className="text-xs font-bold text-[#B45309]">Open Shift</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Active Staff User Chip */}
          {currentUser ? (
            <div
              className={`flex items-center gap-2 rounded-xl bg-white border border-[#E5ECE8] cursor-pointer hover:border-[#0f8a5f]/40 transition ${
                isCollapsed ? 'justify-center p-1.5' : 'p-1.5'
              }`}
              onClick={handleLogout}
              title={`${currentUser.display_name} (${currentUser.role}) — Click to Lock`}
            >
              <div className="w-7 h-7 rounded-lg bg-[#072619] text-[#a3e04f] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                {getInitials(currentUser.display_name)}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 leading-tight">
                  <p className="text-xs font-bold text-[#072619] truncate">{currentUser.display_name}</p>
                  <p className="text-[10px] text-[#4f675a] capitalize">{currentUser.role}</p>
                </div>
              )}
              {!isCollapsed && <Lock className="w-3.5 h-3.5 text-[#4f675a] mr-1" />}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 p-2 rounded-xl bg-[#0f8a5f] text-white font-bold text-xs justify-center transition hover:bg-[#0b6f4c]"
              title="PIN Login"
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
              className={`w-full flex items-center gap-2 py-2 text-xs font-semibold text-[#4f675a] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Fluid Content Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>

      {/* Global Shift Management Dialogs */}
      <OpenShiftDialog
        isOpen={isOpenShiftOpen}
        onOpenChange={setIsOpenShiftOpen}
      />

      <CashDrawerDialog
        isOpen={isDrawerActionOpen}
        onOpenChange={setIsDrawerActionOpen}
      />

      <CloseShiftDialog
        isOpen={isCloseShiftOpen}
        onOpenChange={setIsCloseShiftOpen}
      />
    </div>
  );
}
