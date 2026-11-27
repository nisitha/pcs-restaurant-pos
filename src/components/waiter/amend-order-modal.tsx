'use client';

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  UtensilsCrossed,
  X,
  Send,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMenuStore } from '@/stores/menu-store';
import { formatLKR } from '@/lib/utils/currency';

interface AmendOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  waiterId?: string;
  onSuccess: () => void;
}

interface SelectedAmendItem {
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  station_id?: string | null;
  notes?: string;
}

export function AmendOrderModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  tableNumber,
  waiterId,
  onSuccess,
}: AmendOrderModalProps) {
  const { items, categories } = useMenuStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [amendList, setAmendList] = useState<SelectedAmendItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (!item.is_available) return false;
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddItem = (item: any) => {
    setAmendList((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.name,
          unit_price: Number(item.base_price),
          quantity: 1,
          station_id: item.default_station_id,
        },
      ];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setAmendList((prev) =>
      prev
        .map((i) => {
          if (i.menu_item_id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as SelectedAmendItem[]
    );
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setAmendList((prev) =>
      prev.map((i) => (i.menu_item_id === itemId ? { ...i, notes } : i))
    );
  };

  const totalAmendAmount = amendList.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSubmit = async () => {
    if (amendList.length === 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/orders/amend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          waiterId,
          items: amendList,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit amendment');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending amendment';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl bg-white border border-[#EBECEF] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-white border-b border-[#EBECEF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-bold shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1A1D1F]">Add Extra Items (Amend Order)</h2>
              <p className="text-xs text-[#7C828D]">
                Table <span className="text-[#119C49] font-bold">{tableNumber}</span> &bull; {orderNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F8F9FA] hover:bg-[#F0F2F5] text-[#7C828D] hover:text-[#1A1D1F] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Menu picker on left, Selected list on right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Menu Browser */}
          <div className="w-full md:w-3/5 p-4 flex flex-col border-b md:border-b-0 md:border-r border-[#EBECEF] overflow-hidden">
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C828D]" />
              <input
                type="text"
                placeholder="Search food, beverage, dessert..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#F8F9FA] border border-[#EBECEF] text-xs text-[#1A1D1F] placeholder-[#7C828D] focus:outline-none focus:border-[#119C49]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-[#119C49] text-white shadow-xs'
                    : 'bg-[#F8F9FA] text-[#7C828D] hover:text-[#1A1D1F] border border-[#EBECEF]'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === c.id
                      ? 'bg-[#119C49] text-white shadow-xs'
                      : 'bg-[#F8F9FA] text-[#7C828D] hover:text-[#1A1D1F] border border-[#EBECEF]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF] hover:border-[#119C49]/40 hover:bg-white cursor-pointer flex items-center justify-between transition group shadow-xs"
                >
                  <div>
                    <p className="text-xs font-bold text-[#1A1D1F] group-hover:text-[#119C49] transition">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#119C49] font-bold">{formatLKR(Number(item.base_price))}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white border border-[#EBECEF] text-[#1A1D1F] group-hover:bg-[#119C49] group-hover:text-white group-hover:border-[#119C49] rounded-xl transition"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Selected Amendments Cart */}
          <div className="w-full md:w-2/5 p-4 flex flex-col bg-[#F8F9FA]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7C828D] mb-3">
              Extra Items to Send ({amendList.length})
            </h3>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {amendList.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-[#7C828D] text-xs">
                  <UtensilsCrossed className="w-8 h-8 mb-2 opacity-40 text-[#7C828D]" />
                  <span>Tap items on the left to add extra portions to Table {tableNumber}.</span>
                </div>
              ) : (
                amendList.map((item) => (
                  <div
                    key={item.menu_item_id}
                    className="p-3 rounded-2xl bg-white border border-[#EBECEF] flex flex-col gap-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1A1D1F]">{item.item_name}</p>
                        <p className="text-[11px] text-[#119C49] font-bold">
                          {formatLKR(item.unit_price * item.quantity)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-[#EBECEF]">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.menu_item_id, -1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F0F2F5] transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#1A1D1F] font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.menu_item_id, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F0F2F5] transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Notes for kitchen (e.g. less spice)..."
                      value={item.notes || ''}
                      onChange={(e) => handleUpdateNotes(item.menu_item_id, e.target.value)}
                      className="w-full h-8 px-2.5 text-[11px] rounded-xl bg-[#F8F9FA] border border-[#EBECEF] text-[#1A1D1F] placeholder-[#7C828D] focus:outline-none focus:border-[#119C49]"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Bottom: Send to Kitchen Button */}
            <div className="pt-3 border-t border-[#EBECEF] mt-2">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-[#7C828D]">Amendment Total:</span>
                <span className="font-extrabold text-[#119C49] text-base font-mono">
                  {formatLKR(totalAmendAmount)}
                </span>
              </div>

              <Button
                type="button"
                disabled={amendList.length === 0 || isSubmitting}
                onClick={handleSubmit}
                className="w-full h-11 bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold text-xs rounded-2xl gap-2 shadow-sm transition"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Routing Ticket...' : 'Send Amendment to Kitchen'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
