'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold">{item.name}</DialogTitle>
              {item.description && (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
            <span className="text-lg font-black text-amber-400 whitespace-nowrap">
              {formatLKR(itemTotalPrice)}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Portion Variants (Sizes) */}
          {item.variants && item.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                Select Portion Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {item.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{v.variant_name}</p>
                        <p className="text-[11px] text-zinc-400">{formatLKR(v.price_override)}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
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
                <div key={group.id} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-200">{group.title}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
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
                          className={`p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-white font-semibold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>{mod.name}</span>
                          <span className="text-[11px] text-zinc-400 font-mono">
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
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              Kitchen Instructions / Item Notes
            </label>
            <Input
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="e.g. Less oil, no chili paste, extra crispy..."
              className="bg-zinc-900 border-zinc-800 text-white text-xs"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs font-bold text-zinc-300">Quantity</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 p-0 bg-zinc-800 border-zinc-700 text-white text-base font-bold"
              >
                -
              </Button>
              <span className="font-bold text-lg text-white font-mono min-w-6 text-center">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 p-0 bg-zinc-800 border-zinc-700 text-white text-base font-bold"
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Cart ({formatLKR(itemTotalPrice)})</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
