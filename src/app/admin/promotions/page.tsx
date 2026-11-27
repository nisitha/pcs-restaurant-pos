'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Tag,
  Plus,
  RefreshCw,
  Clock,
  Percent,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatLKR } from '@/lib/utils/currency';
import { Promotion, PromotionType } from '@/types/crm.types';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<PromotionType>('happy_hour');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(15);
  const [formMinOrder, setFormMinOrder] = useState<number>(0);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formStartTime, setFormStartTime] = useState('16:00');
  const [formEndTime, setFormEndTime] = useState('19:00');
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [comboRows, setComboRows] = useState<Array<{ menu_item_id: string; quantity: number }>>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [promoRes, menuRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch('/api/menu'),
      ]);

      const [promoData, menuData] = await Promise.all([
        promoRes.json(),
        menuRes.json(),
      ]);

      if (promoData.success) setPromotions(promoData.promotions || []);
      if (menuData.categories) {
        setCategories(menuData.categories || []);
        const allItems: any[] = [];
        menuData.categories.forEach((cat: any) => {
          (cat.menu_items || []).forEach((item: any) => allItems.push(item));
        });
        setMenuItems(allItems);
      }
    } catch (err) {
      console.error('Failed to load promotions data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewPromoModal = () => {
    setEditingPromo(null);
    setFormName('');
    setFormCode('');
    setFormType('happy_hour');
    setFormDiscountValue(15);
    setFormMinOrder(0);
    setFormCategoryId(categories[0]?.id || '');
    setFormStartTime('16:00');
    setFormEndTime('19:00');
    setFormDays([1, 2, 3, 4, 5]);
    setComboRows([]);
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditPromoModal = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormName(promo.name);
    setFormCode(promo.code || '');
    setFormType(promo.promo_type);
    setFormDiscountValue(promo.discount_value);
    setFormMinOrder(promo.min_order_amount || 0);
    setFormCategoryId(promo.applies_to_category_id || '');
    setFormStartTime(promo.schedule_start_time ? promo.schedule_start_time.slice(0, 5) : '16:00');
    setFormEndTime(promo.schedule_end_time ? promo.schedule_end_time.slice(0, 5) : '19:00');
    setFormDays(promo.days_of_week || [0, 1, 2, 3, 4, 5, 6]);
    setComboRows((promo.combo_items || []).map((ci) => ({ menu_item_id: ci.menu_item_id, quantity: ci.quantity })));
    setFormIsActive(promo.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePromoActive = async (promo: Promotion) => {
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promo.id,
          name: promo.name,
          promo_type: promo.promo_type,
          discount_value: promo.discount_value,
          is_active: !promo.is_active,
        }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to toggle promotion status', err);
    }
  };

  const handleSavePromo = async () => {
    if (!formName.trim()) {
      setFormError('Promotion name is required');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const payload = {
        id: editingPromo ? editingPromo.id : undefined,
        name: formName.trim(),
        code: formCode.trim() || null,
        promo_type: formType,
        discount_value: Number(formDiscountValue),
        min_order_amount: Number(formMinOrder),
        applies_to_category_id: formType === 'happy_hour' ? formCategoryId || null : null,
        schedule_start_time: formType === 'happy_hour' ? `${formStartTime}:00` : null,
        schedule_end_time: formType === 'happy_hour' ? `${formEndTime}:00` : null,
        days_of_week: formDays,
        is_active: formIsActive,
        combo_items: formType === 'combo_deal' ? comboRows : [],
      };

      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to save promotion');
        return;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving promotion');
    } finally {
      setIsSaving(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-[#119C49]" /> Promotions, Happy-Hour & Combos
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Configure scheduled time-based discounts, promo codes, and bundled meal deals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchData}
            className="rounded-2xl border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] gap-1.5 h-10 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-semibold">Refresh</span>
          </Button>

          <Button
            onClick={openNewPromoModal}
            className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs gap-1.5 h-10 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promotion</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Active Rules</p>
            <p className="text-xl font-black text-[#1A1D1F]">
              {promotions.filter((p) => p.is_active).length} Active
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#F59E0B] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Happy-Hour Deals</p>
            <p className="text-xl font-black text-[#F59E0B]">
              {promotions.filter((p) => p.promo_type === 'happy_hour').length} Rules
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Combo Deals</p>
            <p className="text-xl font-black text-[#119C49]">
              {promotions.filter((p) => p.promo_type === 'combo_deal').length} Bundles
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F7F9] text-[#1A1D1F] flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Promo Codes</p>
            <p className="text-xl font-black text-[#1A1D1F]">
              {promotions.filter((p) => p.code).length} Codes
            </p>
          </div>
        </div>
      </div>

      {/* Promotions Cards Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.03 } },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {promotions.map((p) => {
          const typeBadgeColor =
            p.promo_type === 'happy_hour'
              ? 'bg-[#FEF3E2] text-[#F59E0B] border-[#F59E0B]/30'
              : p.promo_type === 'combo_deal'
              ? 'bg-[#D1F0DC] text-[#119C49] border-[#119C49]/30'
              : 'bg-blue-50 text-blue-600 border-blue-200';

          return (
            <motion.div
              key={p.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
              }}
              className={`bg-white rounded-3xl border p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ${
                p.is_active ? 'border-[#EBECEF]' : 'border-zinc-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-extrabold text-[#1A1D1F] text-base leading-tight">
                      {p.name}
                    </h3>
                    {p.code && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F6F7F9] text-[#119C49] mt-1 border border-[#EBECEF]">
                        CODE: {p.code}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${typeBadgeColor}`}
                  >
                    {p.promo_type.replace('_', ' ')}
                  </span>
                </div>

                {/* Discount Display */}
                <div className="my-3 p-3 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF] flex items-center justify-between">
                  <span className="text-xs text-[#7C828D] font-medium">Discount Value</span>
                  <span className="text-base font-black text-[#119C49] font-mono">
                    {p.promo_type === 'percentage' || p.promo_type === 'happy_hour'
                      ? `${p.discount_value}% OFF`
                      : `-${formatLKR(p.discount_value)}`}
                  </span>
                </div>

                {/* Rules & Schedule */}
                <div className="space-y-1.5 text-xs text-[#7C828D]">
                  {p.promo_type === 'happy_hour' && (
                    <>
                      {p.schedule_start_time && p.schedule_end_time && (
                        <p className="flex items-center gap-1.5 font-mono text-[11px] text-[#1A1D1F]">
                          <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>
                            {p.schedule_start_time.slice(0, 5)} - {p.schedule_end_time.slice(0, 5)} (Asia/Colombo)
                          </span>
                        </p>
                      )}
                      {p.category && (
                        <p className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#119C49]" />
                          <span>Category: <b>{p.category.name}</b></span>
                        </p>
                      )}
                    </>
                  )}

                  {p.promo_type === 'combo_deal' && p.combo_items && (
                    <div className="space-y-1 pt-1">
                      <span className="font-bold text-[#1A1D1F] block text-[11px]">Combo Items:</span>
                      {p.combo_items.map((ci, idx) => (
                        <span key={idx} className="block text-[11px] text-[#7C828D]">
                          &bull; {ci.quantity}x {ci.menu_item?.name || 'Item'}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.min_order_amount > 0 && (
                    <p className="text-[11px]">
                      Min. Order: <span className="font-mono font-bold text-[#1A1D1F]">{formatLKR(p.min_order_amount)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-[#F4F5F7] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => togglePromoActive(p)}
                  className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                    p.is_active
                      ? 'bg-[#D1F0DC]/40 text-[#119C49] border-[#119C49]/30'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}
                >
                  {p.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{p.is_active ? 'Active' : 'Inactive'}</span>
                </button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditPromoModal(p)}
                  className="rounded-xl border-[#EBECEF] text-xs h-8 px-2.5 hover:bg-[#F6F7F9]"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  <span>Edit</span>
                </Button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Dialog: Create/Edit Promotion */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white border-[#EBECEF] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
              {editingPromo ? 'Edit Promotion Rule' : 'Create New Promotion'}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Promotion Name</label>
              <Input
                type="text"
                placeholder="e.g. Afternoon Happy Hour 15% Off"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Promo Code (Optional)</label>
                <Input
                  type="text"
                  placeholder="HAPPY15"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="h-10 rounded-2xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Promotion Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as PromotionType)}
                  className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl font-semibold focus:outline-none"
                >
                  <option value="happy_hour">Happy Hour (Time Scheduled)</option>
                  <option value="combo_deal">Combo Meal Deal</option>
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed_amount">Fixed Amount Discount (LKR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">
                  {formType === 'percentage' || formType === 'happy_hour'
                    ? 'Discount Percentage (%)'
                    : 'Discount Amount (LKR)'}
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-10 rounded-2xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Min. Order Amount (LKR)</label>
                <Input
                  type="number"
                  step="50"
                  value={formMinOrder}
                  onChange={(e) => setFormMinOrder(parseFloat(e.target.value) || 0)}
                  className="h-10 rounded-2xl font-mono"
                />
              </div>
            </div>

            {/* Happy Hour Specific Options */}
            {formType === 'happy_hour' && (
              <div className="p-3.5 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] space-y-3">
                <span className="font-bold text-[#1A1D1F] block text-xs">
                  Happy-Hour Schedule & Category
                </span>

                <div>
                  <label className="font-medium text-[#7C828D] block mb-1">Applies to Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-[#EBECEF] rounded-xl font-semibold focus:outline-none text-xs"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium text-[#7C828D] block mb-1">Start Time</label>
                    <Input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="h-9 bg-white rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#7C828D] block mb-1">End Time</label>
                    <Input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="h-9 bg-white rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Combo Deal Specific Options */}
            {formType === 'combo_deal' && (
              <div className="p-3.5 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1A1D1F] block text-xs">Bundled Menu Items</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (menuItems.length > 0) {
                        setComboRows([...comboRows, { menu_item_id: menuItems[0].id, quantity: 1 }]);
                      }
                    }}
                    className="h-7 rounded-xl text-[11px] font-bold text-[#119C49]"
                  >
                    + Add Item
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {comboRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.menu_item_id}
                        onChange={(e) => {
                          const updated = [...comboRows];
                          updated[idx].menu_item_id = e.target.value;
                          setComboRows(updated);
                        }}
                        className="flex-1 h-8 px-2 bg-white rounded-xl text-xs font-semibold"
                      >
                        {menuItems.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({formatLKR(m.base_price)})
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => {
                          const updated = [...comboRows];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setComboRows(updated);
                        }}
                        className="w-16 h-8 rounded-xl font-mono text-center text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setComboRows(comboRows.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-xs px-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePromo}
              disabled={isSaving}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
