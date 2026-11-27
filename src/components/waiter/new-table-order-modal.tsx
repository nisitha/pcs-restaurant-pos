'use client';

import React, { useState } from 'react';
import {
  UtensilsCrossed,
  X,
  Search,
  Plus,
  Minus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMenuStore } from '@/stores/menu-store';
import { formatLKR } from '@/lib/utils/currency';

interface NewTableOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: string;
  waiterId?: string;
  onSuccess: () => void;
}

interface OrderItemEntry {
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  station_id?: string | null;
  notes?: string;
}

export function NewTableOrderModal({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  waiterId,
  onSuccess,
}: NewTableOrderModalProps) {
  const { items, categories } = useMenuStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
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
    setOrderItems((prev) => {
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
    setOrderItems((prev) =>
      prev
        .map((i) => {
          if (i.menu_item_id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItemEntry[]
    );
  };

  const totalAmount = orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSubmit = async () => {
    if (orderItems.length === 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: '00000000-0000-0000-0000-000000000001',
          cashierId: waiterId || '00000000-0000-0000-0000-000000000004',
          orderType: 'dine_in',
          tableId,
          notes: orderNotes.trim() || undefined,
          idempotencyKey: crypto.randomUUID(),
          items: orderItems,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit table order');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting order';
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
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1A1D1F]">Open Order for Table {tableNumber}</h2>
              <p className="text-xs text-[#7C828D]">Dine-In &bull; Automatic Multi-Station Routing</p>
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

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Menu Selection */}
          <div className="w-full md:w-3/5 p-4 flex flex-col border-b md:border-b-0 md:border-r border-[#EBECEF] overflow-hidden">
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

          {/* Cart & Notes */}
          <div className="w-full md:w-2/5 p-4 flex flex-col bg-[#F8F9FA]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7C828D] mb-3">
              Items for Table {tableNumber} ({orderItems.length})
            </h3>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {orderItems.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-[#7C828D] text-xs">
                  <UtensilsCrossed className="w-8 h-8 mb-2 opacity-40 text-[#7C828D]" />
                  <span>Tap menu items on the left to add to this table order.</span>
                </div>
              ) : (
                orderItems.map((item) => (
                  <div
                    key={item.menu_item_id}
                    className="p-3 rounded-2xl bg-white border border-[#EBECEF] flex items-center justify-between shadow-xs"
                  >
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
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#EBECEF] mt-2 space-y-3">
              <input
                type="text"
                placeholder="Special guest instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-white border border-[#EBECEF] text-[#1A1D1F] placeholder-[#7C828D] focus:outline-none focus:border-[#119C49]"
              />

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7C828D]">Subtotal:</span>
                <span className="font-extrabold text-[#119C49] text-base font-mono">
                  {formatLKR(totalAmount)}
                </span>
              </div>

              <Button
                type="button"
                disabled={orderItems.length === 0 || isSubmitting}
                onClick={handleSubmit}
                className="w-full h-11 bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold text-xs rounded-2xl gap-2 shadow-sm transition"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Routing to Kitchen...' : 'Send Order to Kitchen'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
