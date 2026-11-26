'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  History,
  Trash2,
  Scale,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
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
import { formatRestaurantDateTime } from '@/lib/utils/datetime';
import { Ingredient, StockMovement, WastageLog } from '@/types/inventory.types';

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'wastage'>('stock');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [wastageLogs, setWastageLogs] = useState<WastageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isWastageOpen, setIsWastageOpen] = useState(false);

  // Selected Ingredient for Action
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Add Ingredient Form State
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    sku: '',
    unit: 'kg' as any,
    current_stock: 0,
    min_stock_level: 5,
    unit_cost: 0,
    category: 'Dry Goods',
  });

  // Stock Adjustment Form State
  const [actualStockInput, setActualStockInput] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Wastage Form State
  const [wasteQty, setWasteQty] = useState<number>(1);
  const [wasteReason, setWasteReason] = useState('Spoiled / Expired');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ingRes, movRes, wasteRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory/movements'),
        fetch('/api/inventory/wastage'),
      ]);

      const [ingData, movData, wasteData] = await Promise.all([
        ingRes.json(),
        movRes.json(),
        wasteRes.json(),
      ]);

      if (ingData.success) setIngredients(ingData.ingredients || []);
      if (movData.success) setMovements(movData.movements || []);
      if (wasteData.success) setWastageLogs(wasteData.logs || []);
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // KPIs
  const totalValuation = ingredients.reduce((sum, i) => sum + (i.unit_cost * i.current_stock), 0);
  const lowStockCount = ingredients.filter((i) => i.current_stock <= i.min_stock_level).length;
  const totalWastageCost = wastageLogs.reduce((sum, w) => sum + (w.total_cost || 0), 0);

  // Filtered
  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add / Edit Ingredient Submit
  const handleSaveIngredient = async () => {
    if (!newIngredient.name) {
      setFormError('Ingredient name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIngredient),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to save');
        return;
      }
      setIsAddIngredientOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stock Adjustment Submit
  const handleStockAdjustment = async () => {
    if (!selectedIngredient) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: selectedIngredient.id,
          actual_stock: actualStockInput,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to adjust');
        return;
      }
      setIsAdjustStockOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Log Wastage Submit
  const handleLogWastage = async () => {
    if (!selectedIngredient) return;
    if (wasteQty <= 0) {
      setFormError('Quantity must be greater than 0');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/inventory/wastage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: selectedIngredient.id,
          quantity: wasteQty,
          reason: wasteReason,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to log wastage');
        return;
      }
      setIsWastageOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-[#119C49]" /> Inventory, Stock & Wastage
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Real-time ingredient levels, physical variance audits, and wastage tracking in LKR.
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
            onClick={() => {
              setNewIngredient({
                name: '',
                sku: '',
                unit: 'kg',
                current_stock: 0,
                min_stock_level: 5,
                unit_cost: 0,
                category: 'Dry Goods',
              });
              setFormError(null);
              setIsAddIngredientOpen(true);
            }}
            className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs gap-1.5 h-10 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ingredient</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Total Inventory Value</p>
            <p className="text-xl font-black text-[#1A1D1F] font-mono">{formatLKR(totalValuation)}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F7F9] text-[#1A1D1F] flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Tracked Ingredients</p>
            <p className="text-xl font-black text-[#1A1D1F]">{ingredients.length} Items</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-[#D1F0DC] text-[#119C49]'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Low Stock Alerts</p>
            <p
              className={`text-xl font-black ${
                lowStockCount > 0 ? 'text-red-600' : 'text-[#119C49]'
              }`}
            >
              {lowStockCount} Items
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#F59E0B] flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Logged Wastage</p>
            <p className="text-xl font-black text-[#1A1D1F] font-mono">{formatLKR(totalWastageCost)}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBECEF] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'bg-[#119C49] text-white shadow-sm'
              : 'text-[#7C828D] hover:text-[#1A1D1F]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Current Stock Levels ({ingredients.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'bg-[#119C49] text-white shadow-sm'
              : 'text-[#7C828D] hover:text-[#1A1D1F]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movements Ledger ({movements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wastage')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'wastage'
              ? 'bg-[#119C49] text-white shadow-sm'
              : 'text-[#7C828D] hover:text-[#1A1D1F]'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Wastage & Spoilage ({wastageLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Current Stock */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C828D]" />
            <Input
              type="text"
              placeholder="Search ingredient by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-[#EBECEF] rounded-2xl text-xs"
            />
          </div>

          <div className="bg-white rounded-3xl border border-[#EBECEF] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F7F9] text-[#7C828D] border-b border-[#EBECEF] font-bold">
                  <tr>
                    <th className="py-3.5 px-5">Ingredient</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Current Stock</th>
                    <th className="py-3.5 px-4">Min. Alert</th>
                    <th className="py-3.5 px-4">Unit Cost</th>
                    <th className="py-3.5 px-4">Total Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F5F7]">
                  {filteredIngredients.map((ing) => {
                    const isLow = ing.current_stock <= ing.min_stock_level;
                    const isOut = ing.current_stock <= 0;

                    return (
                      <tr key={ing.id} className="hover:bg-[#F6F7F9]/50 transition">
                        <td className="py-3.5 px-5 font-bold text-[#1A1D1F]">
                          {ing.name}
                          {ing.sku && (
                            <span className="block text-[10px] text-[#7C828D] font-mono">
                              {ing.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#7C828D]">{ing.category}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1A1D1F]">
                          {ing.current_stock} {ing.unit}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#7C828D]">
                          {ing.min_stock_level} {ing.unit}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#1A1D1F]">
                          {formatLKR(ing.unit_cost)} / {ing.unit}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#119C49]">
                          {formatLKR(ing.current_stock * ing.unit_cost)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-[#FEF3E2] text-[#F59E0B]'
                                : 'bg-[#D1F0DC] text-[#119C49]'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIngredient(ing);
                              setActualStockInput(ing.current_stock);
                              setAdjustReason('');
                              setFormError(null);
                              setIsAdjustStockOpen(true);
                            }}
                            className="rounded-xl border-[#EBECEF] text-xs h-8 px-2.5 hover:bg-[#F6F7F9]"
                          >
                            Count / Adjust
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIngredient(ing);
                              setWasteQty(1);
                              setWasteReason('Spoiled / Expired');
                              setFormError(null);
                              setIsWastageOpen(true);
                            }}
                            className="rounded-xl border-[#EBECEF] text-xs h-8 px-2.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                          >
                            Log Waste
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movements Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-[#EBECEF] shadow-sm overflow-hidden">
          <div className="p-4 bg-[#F6F7F9] border-b border-[#EBECEF] flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1D1F]">
              Immutable Stock Movement Ledger (Recent 100 Transactions)
            </span>
            <span className="text-[11px] text-[#7C828D]">Automated & Idempotent</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F7F9] text-[#7C828D] border-b border-[#EBECEF] font-bold">
                <tr>
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-4">Ingredient</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-5">Notes / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-[#F6F7F9]/50 transition">
                      <td className="py-3 px-5 font-mono text-[#7C828D] text-[11px]">
                        {formatRestaurantDateTime(m.created_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1A1D1F]">
                        {m.ingredient?.name || 'Ingredient'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F6F7F9] text-[#1A1D1F]">
                          {m.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-[#119C49]' : 'text-red-500'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${m.quantity}` : m.quantity} {m.ingredient?.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#7C828D]">
                        {formatLKR(m.unit_cost)}
                      </td>
                      <td className="py-3 px-5 text-[#7C828D] text-[11px]">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Wastage Logs */}
      {activeTab === 'wastage' && (
        <div className="bg-white rounded-3xl border border-[#EBECEF] shadow-sm overflow-hidden">
          <div className="p-4 bg-[#F6F7F9] border-b border-[#EBECEF] flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1D1F]">
              Wastage & Spoilage Incident Log
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F7F9] text-[#7C828D] border-b border-[#EBECEF] font-bold">
                <tr>
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-4">Ingredient</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Total Cost (LKR)</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-5">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {wastageLogs.map((w) => (
                  <tr key={w.id} className="hover:bg-[#F6F7F9]/50 transition">
                    <td className="py-3 px-5 font-mono text-[#7C828D] text-[11px]">
                      {formatRestaurantDateTime(w.created_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1A1D1F]">
                      {w.ingredient?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-red-600 font-bold">
                      {w.quantity} {w.ingredient?.unit}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#1A1D1F]">
                      {formatLKR(w.total_cost)}
                    </td>
                    <td className="py-3 px-4 text-[#7C828D]">{w.reason}</td>
                    <td className="py-3 px-5 text-[#1A1D1F] font-semibold">
                      {w.user?.display_name || 'Manager Kumara'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog: Add Ingredient */}
      <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
              Add New Ingredient
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Ingredient Name</label>
              <Input
                type="text"
                placeholder="e.g. Basmati Rice"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">SKU / Code</label>
                <Input
                  type="text"
                  placeholder="ING-RICE"
                  value={newIngredient.sku}
                  onChange={(e) => setNewIngredient({ ...newIngredient, sku: e.target.value })}
                  className="h-10 rounded-2xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Base Unit</label>
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as any })}
                  className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl text-xs font-semibold focus:outline-none"
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="g">g (Grams)</option>
                  <option value="l">l (Liters)</option>
                  <option value="ml">ml (Milliliters)</option>
                  <option value="pcs">pcs (Pieces)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Current Stock</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newIngredient.current_stock}
                  onChange={(e) =>
                    setNewIngredient({ ...newIngredient, current_stock: parseFloat(e.target.value) || 0 })
                  }
                  className="h-10 rounded-2xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Min. Alert Level</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newIngredient.min_stock_level}
                  onChange={(e) =>
                    setNewIngredient({ ...newIngredient, min_stock_level: parseFloat(e.target.value) || 0 })
                  }
                  className="h-10 rounded-2xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Unit Cost (LKR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newIngredient.unit_cost}
                  onChange={(e) =>
                    setNewIngredient({ ...newIngredient, unit_cost: parseFloat(e.target.value) || 0 })
                  }
                  className="h-10 rounded-2xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Category</label>
                <Input
                  type="text"
                  placeholder="Dry Goods, Meat, Dairy"
                  value={newIngredient.category}
                  onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                  className="h-10 rounded-2xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddIngredientOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveIngredient}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white"
            >
              {isSubmitting ? 'Saving...' : 'Add Ingredient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Physical Count / Variance Adjustment */}
      <Dialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
              Stock Count / Physical Adjustment
            </DialogTitle>
          </DialogHeader>

          {selectedIngredient && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF]">
                <span className="text-[10px] text-[#7C828D] block">Selected Ingredient</span>
                <span className="text-base font-extrabold text-[#1A1D1F]">
                  {selectedIngredient.name}
                </span>
                <span className="text-xs text-[#7C828D] block mt-0.5 font-mono">
                  Current System Stock: {selectedIngredient.current_stock} {selectedIngredient.unit}
                </span>
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">
                  Actual Counted Stock ({selectedIngredient.unit})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  value={actualStockInput}
                  onChange={(e) => setActualStockInput(parseFloat(e.target.value) || 0)}
                  className="h-11 rounded-2xl text-sm font-mono font-bold"
                />
              </div>

              {/* Calculated Variance */}
              <div className="p-3 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between">
                <span className="text-xs text-[#7C828D] font-medium">Variance (Adjustment)</span>
                <span
                  className={`text-sm font-black font-mono ${
                    actualStockInput - selectedIngredient.current_stock >= 0
                      ? 'text-[#119C49]'
                      : 'text-red-500'
                  }`}
                >
                  {actualStockInput - selectedIngredient.current_stock > 0 ? '+' : ''}
                  {Math.round((actualStockInput - selectedIngredient.current_stock) * 1000) / 1000}{' '}
                  {selectedIngredient.unit}
                </span>
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">
                  Adjustment Reason / Notes
                </label>
                <Input
                  type="text"
                  placeholder="e.g. End of month physical stock count"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="h-10 rounded-2xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustStockOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStockAdjustment}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              {isSubmitting ? 'Adjusting...' : 'Confirm Stock Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Log Wastage */}
      <Dialog open={isWastageOpen} onOpenChange={setIsWastageOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F] text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Log Spoilage / Wastage
            </DialogTitle>
          </DialogHeader>

          {selectedIngredient && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF]">
                <span className="text-[10px] text-[#7C828D] block">Ingredient</span>
                <span className="text-base font-extrabold text-[#1A1D1F]">
                  {selectedIngredient.name}
                </span>
                <span className="text-xs text-[#7C828D] block font-mono">
                  Unit Cost: {formatLKR(selectedIngredient.unit_cost)} / {selectedIngredient.unit}
                </span>
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">
                  Wasted Quantity ({selectedIngredient.unit})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(parseFloat(e.target.value) || 0)}
                  className="h-11 rounded-2xl font-mono text-sm font-bold"
                />
              </div>

              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
                <span className="text-xs text-red-700 font-semibold">Total Wastage Cost</span>
                <span className="text-sm font-black font-mono text-red-600">
                  {formatLKR(wasteQty * selectedIngredient.unit_cost)}
                </span>
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">
                  Mandatory Reason / Notes
                </label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl text-xs font-semibold focus:outline-none mb-2"
                >
                  <option value="Spoiled / Expired">Spoiled / Expired</option>
                  <option value="Burnt during cooking">Burnt during cooking</option>
                  <option value="Dropped / Accidental Spillage">Dropped / Accidental Spillage</option>
                  <option value="Quality Inspection Rejection">Quality Inspection Rejection</option>
                  <option value="Prep trim loss excess">Prep trim loss excess</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsWastageOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLogWastage}
              disabled={isSubmitting}
              className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Wastage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
