'use client';

import React, { useState, useEffect } from 'react';
import { useMenuStore } from '@/stores/menu-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ItemModal } from '@/components/menu/item-modal';
import { formatLKR } from '@/lib/utils/currency';
import {
  Utensils,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChefHat,
  Flame,
  Coffee,
  IceCream,
  Settings,
} from 'lucide-react';

export default function MenuManagementPage() {
  const { currentUser } = useAuthStore();
  const {
    categories,
    items,
    stations,
    cachedVersion,
    fetchMenu,
    toggleAvailability,
    isLoading,
  } = useMenuStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const availableCount = items.filter((i) => i.is_available).length;
  const unavailableCount = items.filter((i) => !i.is_available).length;

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    setIsToggling(itemId);
    await toggleAvailability(itemId, currentStatus);
    setIsToggling(null);
  };

  const getStationBadge = (stationId?: string | null) => {
    const stn = stations.find((s) => s.id === stationId);
    if (!stn) return null;

    let color = 'bg-[#F4F5F7] text-[#7C828D]';
    if (stn.code === 'HOT') color = 'bg-orange-50 text-orange-600 border border-orange-200';
    if (stn.code === 'GRILL') color = 'bg-red-50 text-red-600 border border-red-200';
    if (stn.code === 'BEV') color = 'bg-cyan-50 text-cyan-700 border border-cyan-200';
    if (stn.code === 'DESSERT') color = 'bg-pink-50 text-pink-600 border border-pink-200';

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${color}`}>
        {stn.name}
      </span>
    );
  };

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EBECEF] pb-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#119C49]" /> Menu Settings & Catalog
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Configure dish prices in LKR, kitchen station assignments, and toggle item availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMenu(true)}
            disabled={isLoading}
            className="bg-white border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F6F7F9] text-xs font-bold rounded-full gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>

          <Button
            onClick={() => setIsAddItemModalOpen(true)}
            className="bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs rounded-full gap-1.5 shadow-md shadow-[#119C49]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </Button>
        </div>
      </div>

      {/* Counters & Version */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-[#7C828D]">Available Dishes</p>
          <p className="text-2xl font-black text-[#119C49] font-mono mt-1">{availableCount}</p>
        </div>
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-[#7C828D]">86 Unavailable Dishes</p>
          <p className="text-2xl font-black text-rose-500 font-mono mt-1">{unavailableCount}</p>
        </div>
        <div className="bg-white border border-[#EBECEF] rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-[#7C828D]">Cache Version</p>
          <p className="text-2xl font-black text-[#1A1D1F] font-mono mt-1">v{cachedVersion}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#EBECEF] rounded-3xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C828D]" />
          <Input
            placeholder="Search dish or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-full bg-[#F6F7F9] border-[#EBECEF] text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCategoryId === 'all'
                ? 'bg-[#119C49] text-white shadow-sm'
                : 'bg-[#F6F7F9] text-[#7C828D] hover:text-[#1A1D1F]'
            }`}
          >
            All ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCategoryId === cat.id
                  ? 'bg-[#119C49] text-white shadow-sm'
                  : 'bg-[#F6F7F9] text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition ${
              item.is_available ? 'border-[#EBECEF]' : 'border-rose-200 bg-rose-50/20 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1D1F] leading-snug">{item.name}</h3>
                  {item.sku && <p className="text-[10px] text-[#7C828D] font-mono mt-0.5">SKU: {item.sku}</p>}
                </div>
                {getStationBadge(item.default_station_id)}
              </div>

              <p className="text-lg font-black text-[#119C49] font-mono mt-2">
                {formatLKR(Number(item.base_price))}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F4F5F7] flex items-center justify-between">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  item.is_available ? 'bg-[#D1F0DC] text-[#119C49]' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {item.is_available ? 'In Stock' : '86 Unavailable'}
              </span>

              <Button
                size="sm"
                variant="outline"
                disabled={isToggling === item.id}
                onClick={() => handleToggle(item.id, item.is_available)}
                className={`h-8 px-3 rounded-full text-xs font-bold border transition ${
                  item.is_available
                    ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                    : 'border-[#BDE8CB] text-[#119C49] hover:bg-[#D1F0DC]'
                }`}
              >
                {isToggling === item.id ? 'Updating...' : item.is_available ? '86 Dish' : 'Make In Stock'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ItemModal
        isOpen={isAddItemModalOpen}
        onOpenChange={setIsAddItemModalOpen}
        categories={categories}
        stations={stations}
        onSuccess={() => {
          setIsAddItemModalOpen(false);
          fetchMenu(true);
        }}
      />
    </div>
  );
}
