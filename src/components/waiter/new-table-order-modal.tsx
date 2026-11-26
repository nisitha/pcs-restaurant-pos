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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Open Order for Table {tableNumber}</h2>
              <p className="text-xs text-zinc-400">Dine-In &bull; Automatic Multi-Station Routing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Menu Selection */}
          <div className="w-full md:w-3/5 p-4 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 overflow-hidden">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search food, beverage, dessert..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === c.id
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
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
                  className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/40 hover:bg-zinc-950 cursor-pointer flex items-center justify-between transition group"
                >
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">{formatLKR(Number(item.base_price))}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-8 p-0 bg-zinc-900 border border-zinc-700 text-zinc-200 group-hover:bg-emerald-500 group-hover:text-zinc-950 group-hover:border-emerald-500 rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Cart & Notes */}
          <div className="w-full md:w-2/5 p-4 flex flex-col bg-zinc-950/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Items for Table {tableNumber} ({orderItems.length})
            </h3>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {orderItems.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs">
                  <UtensilsCrossed className="w-8 h-8 mb-2 opacity-40" />
                  <span>Tap menu items on the left to add to this table order.</span>
                </div>
              ) : (
                orderItems.map((item) => (
                  <div
                    key={item.menu_item_id}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{item.item_name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {formatLKR(item.unit_price * item.quantity)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.menu_item_id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.menu_item_id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 mt-2 space-y-3">
              <input
                type="text"
                placeholder="Special guest instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Subtotal:</span>
                <span className="font-extrabold text-white text-sm font-mono">
                  {formatLKR(totalAmount)}
                </span>
              </div>

              <Button
                type="button"
                disabled={orderItems.length === 0 || isSubmitting}
                onClick={handleSubmit}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl gap-2 shadow-lg transition"
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
