'use client';

import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { compressImageToWebP } from '@/lib/utils/image-compression';
import { createClient } from '@/lib/supabase/client';
import { MenuCategory, KitchenStation, MenuItem } from '@/types/menu.types';
import { Upload, Image as ImageIcon, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';

interface ItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  stations: KitchenStation[];
  onSuccess: (newItem: MenuItem) => void;
}

export function ItemModal({
  isOpen,
  onOpenChange,
  categories,
  stations,
  onSuccess,
}: ItemModalProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [defaultStationId, setDefaultStationId] = useState(stations[0]?.id || '');
  const [basePrice, setBasePrice] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');

  // Variants state
  const [variants, setVariants] = useState<Array<{ variant_name: string; price_override: string; is_default: boolean }>>([]);

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setError(null);

      // Client-side WebP compression (< 100 KB)
      const compressed = await compressImageToWebP(file, 600, 600, 100 * 1024);
      setSelectedFile(compressed.file);
      setPreviewUrl(compressed.dataUrl);
      setCompressedSizeKb(compressed.sizeKb);
    } catch {
      setError('Failed to compress image. Please upload a standard JPG or PNG.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      { variant_name: '', price_override: basePrice || '0', is_default: variants.length === 0 },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(basePrice);
    if (!name.trim() || isNaN(price) || price < 0 || !categoryId) {
      setError('Please provide a valid item name, category, and base price.');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedImageUrl: string | null = null;

      // 1. Upload compressed WebP to Supabase Storage if file was selected
      if (selectedFile) {
        try {
          const supabase = createClient();
          const fileName = `item_${Date.now()}_${selectedFile.name}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload(fileName, selectedFile, {
              contentType: 'image/webp',
              upsert: true,
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('menu-images')
              .getPublicUrl(uploadData.path);
            uploadedImageUrl = publicUrlData.publicUrl;
          }
        } catch {
          // If storage bucket isn't yet configured, continue with data URL or null
          uploadedImageUrl = previewUrl;
        }
      }

      // 2. Submit to API
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          categoryId,
          defaultStationId: defaultStationId || null,
          basePrice: price,
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: uploadedImageUrl,
          variants: variants.map((v) => ({
            variant_name: v.variant_name.trim(),
            price_override: parseFloat(v.price_override) || price,
            is_default: v.is_default,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save item');
      }

      onSuccess(data.item);
      onOpenChange(false);

      // Reset form
      setName('');
      setBasePrice('');
      setDescription('');
      setSku('');
      setVariants([]);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressedSizeKb(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating item';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#EBECEF] text-[#1A1D1F] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-black text-[#1A1D1F] tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#119C49]" /> Add New Menu Item
          </DialogTitle>
          <DialogDescription className="text-xs text-[#7C828D]">
            Create a new catalog item with pricing, station routing, and photo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Seafood Nasi Goreng"
                className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] text-xs h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 rounded-xl bg-[#F8F9FA] border border-[#EBECEF] text-[#1A1D1F] text-xs px-3 focus:outline-none focus:ring-1 focus:ring-[#119C49]"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Base Price (LKR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7C828D]">Rs.</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="1450.00"
                  className="pl-10 bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] text-xs font-bold h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Kitchen Station Routing
              </label>
              <select
                value={defaultStationId}
                onChange={(e) => setDefaultStationId(e.target.value)}
                className="w-full h-10 rounded-xl bg-[#F8F9FA] border border-[#EBECEF] text-[#1A1D1F] text-xs px-3 focus:outline-none focus:ring-1 focus:ring-[#119C49]"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
              Description (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key ingredients, allergens, preparation notes..."
              rows={2}
              className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] placeholder:text-[#7C828D] text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
            />
          </div>

          {/* Client-Side Compressed Image Upload */}
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EBECEF]">
            <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5 flex items-center justify-between">
              <span>Item Photo (Client Compressed WebP &lt; 100KB)</span>
              {compressedSizeKb !== null && (
                <span className="text-[#119C49] text-[11px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {compressedSizeKb} KB WebP
                </span>
              )}
            </label>

            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-20 h-20 rounded-2xl object-cover border border-[#EBECEF] shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white border border-dashed border-[#EBECEF] flex items-center justify-center text-[#7C828D] shrink-0">
                  <ImageIcon className="w-6 h-6 opacity-60" />
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EBECEF] hover:bg-[#F0F2F5] text-[#1A1D1F] text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#119C49]" />
                  {isCompressing ? 'Compressing...' : 'Upload Image'}
                </label>
                <p className="text-[11px] text-[#7C828D] mt-1">
                  Automatic client compression to 600px WebP prevents database storage bloat.
                </p>
              </div>
            </div>
          </div>

          {/* Portion Variants Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1A1D1F]">
                Portion Variants / Sizes (Optional)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
                className="h-8 text-[11px] font-bold bg-[#F8F9FA] border-[#EBECEF] text-[#119C49] hover:bg-[#D1F0DC]/60 rounded-xl"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Variant
              </Button>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Regular, Large"
                      value={v.variant_name}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[idx].variant_name = e.target.value;
                        setVariants(updated);
                      }}
                      className="bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] text-xs h-9 rounded-xl flex-1 focus-visible:ring-1 focus-visible:ring-[#119C49]"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-[#7C828D]">Rs.</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={v.price_override}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].price_override = e.target.value;
                          setVariants(updated);
                        }}
                        className="pl-8 bg-[#F8F9FA] border-[#EBECEF] text-[#1A1D1F] text-xs font-bold h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-[#119C49]"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveVariant(idx)}
                      className="text-[#7C828D] hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-[#EBECEF] flex sm:flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#F8F9FA] rounded-2xl h-11 px-5 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="bg-[#119C49] hover:bg-[#0E823D] text-white font-extrabold rounded-2xl h-11 px-6 shadow-sm flex-1 sm:flex-initial"
            >
              {isSubmitting ? 'Saving Item...' : 'Save & Add to Menu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
