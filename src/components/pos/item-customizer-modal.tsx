'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MenuItem, ItemVariant, Modifier } from '@/types/menu.types';
import { CartItem, CartItemModifier } from '@/types/pos.types';
import { formatLKR } from '@/lib/utils/currency';
import { Plus, Check, Utensils, Sparkles } from 'lucide-react';

interface ItemCustomizerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onAddToCart: (customizedItem: Omit<CartItem, 'cart_item_id'>) => void;
}

export function ItemCustomizerModal({
  isOpen,
  onOpenChange,
  item,
  onAddToCart,
}: ItemCustomizerModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Initialize variant when item changes
  useEffect(() => {
    if (item) {
      const defaultVar = (item.variants || []).find((v) => v.is_default) || item.variants?.[0] || null;
      setSelectedVariant(defaultVar);
      setSelectedModifiers([]);
      setItemNotes('');
      setQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  // Calculate base price from selected variant or item base_price
  const currentBasePrice = selectedVariant ? Number(selectedVariant.price_override) : Number(item.base_price);
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + Number(m.price_addition), 0);
  const singleItemPrice = currentBasePrice + modifiersTotal;
  const itemTotalPrice = singleItemPrice * quantity;

  const handleToggleModifier = (modifier: Modifier, maxSelection = 1) => {
    const exists = selectedModifiers.some((m) => m.id === modifier.id);
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.id !== modifier.id));
    } else {
      if (maxSelection === 1) {
        // Replace modifiers belonging to same group
        const filtered = selectedModifiers.filter((m) => m.group_id !== modifier.group_id);
        setSelectedModifiers([...filtered, modifier]);
      } else {
        setSelectedModifiers([...selectedModifiers, modifier]);
      }
    }
  };

  const handleConfirm = () => {
    const cartModifiers: CartItemModifier[] = selectedModifiers.map((m) => ({
      modifier_id: m.id,
      modifier_name: m.name,
      unit_price: Number(m.price_addition),
    }));

    onAddToCart({
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: singleItemPrice,
      quantity,
      station_id: item.default_station_id,
      station_name: item.station?.name || 'Kitchen',
      variant_id: selectedVariant?.id || null,
      variant_name: selectedVariant?.variant_name || null,
      modifiers: cartModifiers,
      notes: itemNotes.trim() || null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight">{item.name}</DialogTitle>
              <span className="text-lg font-black text-[#119C49] whitespace-nowrap">
                {formatLKR(itemTotalPrice)}
              </span>
            </div>
            {item.description ? (
              <DialogDescription className="text-xs text-[#7C828D] leading-relaxed">
                {item.description}
              </DialogDescription>
            ) : (
              <DialogDescription className="text-xs text-[#7C828D]">
                Customize your order options and portion size below.
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Portion Variants (Sizes) */}
          {item.variants && item.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] uppercase tracking-wider block mb-2">
                Select Portion Size
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {item.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#D1F0DC]/60 border-2 border-[#119C49] text-[#119C49] font-bold shadow-xs'
                          : 'bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F0F2F5]'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{v.variant_name}</p>
                        <p className={`text-[11px] ${isSelected ? 'text-[#119C49]/80 font-medium' : 'text-[#7C828D]'}`}>
                          {formatLKR(v.price_override)}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#119C49] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifier Groups (e.g. Spice Level, Add-ons) */}
          {item.modifier_groups && item.modifier_groups.length > 0 && (
            <div className="space-y-4">
              {item.modifier_groups.map((group) => (
                <div key={group.id} className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-[#1A1D1F]">{group.title}</span>
                    <span className="text-[11px] font-semibold text-[#7C828D] bg-white border border-[#EBECEF] px-2 py-0.5 rounded-full">
                      {group.max_selection === 1 ? 'Choose 1' : `Up to ${group.max_selection}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(group.modifiers || []).map((mod) => {
                      const isSelected = selectedModifiers.some((m) => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => handleToggleModifier(mod, group.max_selection)}
                          className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#D1F0DC]/60 border-2 border-[#119C49] text-[#119C49] font-bold shadow-xs'
                              : 'bg-white border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F0F2F5]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#119C49] text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                            <span>{mod.name}</span>
                          </div>
                          <span className={`text-[11px] font-mono ${isSelected ? 'text-[#119C49] font-bold' : 'text-[#7C828D]'}`}>
                            {Number(mod.price_addition) > 0 ? `+${formatLKR(mod.price_addition)}` : 'Free'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Preparation Instructions / Notes */}
          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">
              Kitchen Instructions / Item Notes
            </label>
            <Input
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="e.g. Less oil, no chili paste, extra crispy..."
              className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] placeholder:text-[#7C828D] text-xs h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]">
            <div>
              <span className="text-xs font-bold text-[#1A1D1F] block">Quantity</span>
              <span className="text-[11px] text-[#7C828D]">Select number of portions</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-full bg-[#119C49] hover:bg-[#0E823D] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-sm transition"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="font-extrabold text-lg text-[#1A1D1F] font-mono min-w-8 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-full bg-[#119C49] hover:bg-[#0E823D] active:scale-95 text-white flex items-center justify-center font-bold text-lg shadow-sm transition"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-[#EBECEF] flex sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F8F9FA] h-12 px-5 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-[#119C49] hover:bg-[#0E823D] active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl h-12 px-6 shadow-sm gap-2 transition flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add to Cart ({formatLKR(itemTotalPrice)})</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
