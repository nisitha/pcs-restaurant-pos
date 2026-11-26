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
  Database,
  Flame,
  Coffee,
  IceCream,
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
    updateCachedItem,
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

  const stationBadges: Record<string, string> = {
    HOT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    GRILL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    BEV: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    DESSERT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
              <Utensils className="w-7 h-7 text-amber-500" /> Menu & Category Management
            </h1>
            <Badge variant="outline" className="text-[11px] bg-zinc-900 border-zinc-800 text-zinc-400">
              v{cachedVersion}
            </Badge>
          </div>
          <p className="text-sm text-zinc-400">
            Client-cached catalog with instant 86-ing ("Unavailable") and station routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMenu(true)}
            disabled={isLoading}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Force Sync</span>
          </Button>

          <Button
            onClick={() => setIsAddItemModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Total Dishes & Drinks</span>
          <p className="text-2xl font-bold text-white">{items.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">In Stock (Active)</span>
          <p className="text-2xl font-bold text-emerald-400">{availableCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">86 Unavailable</span>
          <p className="text-2xl font-bold text-rose-400">{unavailableCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Kitchen Stations</span>
          <p className="text-2xl font-bold text-blue-400">{stations.length} Active</p>
        </div>
      </div>

      {/* Controls: Search + Categories */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCategoryId('all')}
            className={`text-xs rounded-lg ${
              selectedCategoryId === 'all'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            All Items ({items.length})
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant="ghost"
              onClick={() => setSelectedCategoryId(c.id)}
              className={`text-xs rounded-lg whitespace-nowrap ${
                selectedCategoryId === c.id
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {c.name}
            </Button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish or SKU..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-white text-xs"
          />
        </div>
      </div>

      {/* Menu Item Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const stationCode = item.station?.code || 'HOT';
          const isTogglingThis = isToggling === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                item.is_available
                  ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-950/60 border-rose-500/20 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          stationBadges[stationCode] || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {item.station?.name || stationCode}
                      </span>
                      {item.sku && <span className="text-[10px] text-zinc-500 font-mono">{item.sku}</span>}
                    </div>
                    <h3 className="font-bold text-base text-white leading-tight">{item.name}</h3>
                  </div>

                  <span className="text-base font-black text-amber-400 whitespace-nowrap">
                    {formatLKR(item.base_price)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {item.variants && item.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.variants.map((v) => (
                      <span
                        key={v.id}
                        className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700"
                      >
                        {v.variant_name}: {formatLKR(v.price_override)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions: Toggle Stock Status */}
              <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    item.is_available ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.is_available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> 86 (Unavailable)
                    </>
                  )}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTogglingThis}
                  onClick={() => handleToggle(item.id, item.is_available)}
                  className={`h-7 px-3 text-xs font-semibold rounded-lg transition ${
                    item.is_available
                      ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {item.is_available ? 'Mark 86 (Out of Stock)' : 'Mark In Stock'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
          <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-zinc-400">No dishes match the filter.</p>
        </div>
      )}

      {/* Add Item Modal */}
      <ItemModal
        isOpen={isAddItemModalOpen}
        onOpenChange={setIsAddItemModalOpen}
        categories={categories}
        stations={stations}
        onSuccess={(newItem) => {
          updateCachedItem(newItem);
        }}
      />
    </div>
  );
}
