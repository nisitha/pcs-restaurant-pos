'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Percent,
  Search,
  RefreshCw,
  Scale,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Calculator,
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
import { Recipe, Ingredient } from '@/types/inventory.types';

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Recipe Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | ''>('');
  const [recipeNotes, setRecipeNotes] = useState('');
  const [bomRows, setBomRows] = useState<
    Array<{
      ingredient_id: string;
      quantity: number;
      unit: string;
    }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, ingRes, menuRes] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/inventory'),
        fetch('/api/menu'),
      ]);

      const [recData, ingData, menuData] = await Promise.all([
        recRes.json(),
        ingRes.json(),
        menuRes.json(),
      ]);

      if (recData.success) setRecipes(recData.recipes || []);
      if (ingData.success) setIngredients(ingData.ingredients || []);
      if (menuData.categories) {
        const allItems: any[] = [];
        menuData.categories.forEach((cat: any) => {
          (cat.menu_items || []).forEach((item: any) => allItems.push(item));
        });
        setMenuItems(allItems);
      }
    } catch (err) {
      console.error('Failed to load recipes data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewRecipeModal = () => {
    setEditingRecipe(null);
    setSelectedMenuItemId(menuItems[0]?.id || '');
    setSelectedVariantId('');
    setRecipeNotes('');
    setBomRows([
      {
        ingredient_id: ingredients[0]?.id || '',
        quantity: 0.1,
        unit: ingredients[0]?.unit || 'kg',
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditRecipeModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setSelectedMenuItemId(recipe.menu_item_id);
    setSelectedVariantId(recipe.variant_id || '');
    setRecipeNotes(recipe.notes || '');
    setBomRows(
      (recipe.items || []).map((it) => ({
        ingredient_id: it.ingredient_id,
        quantity: it.quantity,
        unit: it.unit,
      }))
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (ingredients.length === 0) return;
    setBomRows([
      ...bomRows,
      {
        ingredient_id: ingredients[0].id,
        quantity: 0.1,
        unit: ingredients[0].unit,
      },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setBomRows(bomRows.filter((_, idx) => idx !== index));
  };

  const handleRowIngredientChange = (index: number, ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    const updated = [...bomRows];
    updated[index] = {
      ...updated[index],
      ingredient_id: ingredientId,
      unit: ing ? ing.unit : 'kg',
    };
    setBomRows(updated);
  };

  const handleRowQuantityChange = (index: number, qtyStr: string) => {
    const qty = parseFloat(qtyStr) || 0;
    const updated = [...bomRows];
    updated[index] = {
      ...updated[index],
      quantity: qty,
    };
    setBomRows(updated);
  };

  // Calculate live food cost in modal
  const selectedItem = menuItems.find((m) => m.id === selectedMenuItemId);
  const selectedVariant = selectedItem?.item_variants?.find(
    (v: any) => v.id === selectedVariantId
  );
  const currentSellingPrice = Number(
    selectedVariant?.price_override || selectedItem?.base_price || 0
  );

  const computedModalFoodCost = bomRows.reduce((acc, row) => {
    const ing = ingredients.find((i) => i.id === row.ingredient_id);
    const unitCost = Number(ing?.unit_cost || 0);
    return acc + row.quantity * unitCost;
  }, 0);

  const computedModalMargin =
    currentSellingPrice > 0
      ? Math.round(
          ((currentSellingPrice - computedModalFoodCost) / currentSellingPrice) *
            1000
        ) / 10
      : 0;

  const handleSaveRecipe = async () => {
    if (!selectedMenuItemId) {
      setFormError('Please select a menu dish.');
      return;
    }
    if (bomRows.length === 0) {
      setFormError('Please add at least one ingredient to the BOM.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: selectedMenuItemId,
          variant_id: selectedVariantId || null,
          yield_quantity: 1,
          notes: recipeNotes,
          items: bomRows,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to save recipe');
        return;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    const dishName = r.menu_item?.name?.toLowerCase() || '';
    const variantName = r.variant?.variant_name?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return dishName.includes(q) || variantName.includes(q);
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <UtensilsCrossed className="w-7 h-7 text-[#119C49]" /> Recipe (BOM) & Food Cost
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Bill of Materials (BOM), automatic inventory deduction formulas, and expected profit margins per dish.
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
            onClick={openNewRecipeModal}
            className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs gap-1.5 h-10 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create BOM Recipe</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Configured Recipes</p>
            <p className="text-2xl font-black text-[#1A1D1F]">{recipes.length} Dishes</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#F59E0B] flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Avg Food Cost Ratio</p>
            <p className="text-2xl font-black text-[#1A1D1F]">
              {recipes.length > 0
                ? Math.round(
                    100 -
                      recipes.reduce((acc, r) => acc + (r.gross_margin_percent || 0), 0) /
                        recipes.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Avg Gross Margin</p>
            <p className="text-2xl font-black text-[#119C49]">
              {recipes.length > 0
                ? Math.round(
                    recipes.reduce((acc, r) => acc + (r.gross_margin_percent || 0), 0) /
                      recipes.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C828D]" />
        <Input
          type="text"
          placeholder="Search dish or portion..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-white border-[#EBECEF] rounded-2xl text-xs"
        />
      </div>

      {/* Recipe Cards Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#EBECEF] text-center shadow-sm">
          <UtensilsCrossed className="w-12 h-12 text-[#7C828D]/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-[#1A1D1F]">No BOM Recipes Found</p>
          <p className="text-xs text-[#7C828D] mt-1">
            Create ingredient Bill of Materials for your menu items to enable automatic stock deduction on sales.
          </p>
          <Button
            onClick={openNewRecipeModal}
            className="mt-4 rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white text-xs font-bold"
          >
            Create First Recipe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((r) => {
            const margin = r.gross_margin_percent || 0;
            const marginBadgeColor =
              margin >= 70
                ? 'bg-[#D1F0DC] text-[#119C49] border-[#119C49]/20'
                : margin >= 50
                ? 'bg-[#FEF3E2] text-[#F59E0B] border-[#F59E0B]/20'
                : 'bg-red-50 text-red-600 border-red-200';

            return (
              <div
                key={r.id}
                className="bg-white rounded-3xl border border-[#EBECEF] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-extrabold text-[#1A1D1F] text-base">
                        {r.menu_item?.name || 'Unnamed Dish'}
                      </h3>
                      {r.variant?.variant_name && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F6F7F9] text-[#7C828D] mt-1">
                          {r.variant.variant_name}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black border ${marginBadgeColor}`}
                    >
                      {margin}% Margin
                    </span>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF]">
                    <div>
                      <span className="text-[10px] text-[#7C828D] font-medium block">
                        Estimated Cost (BOM)
                      </span>
                      <span className="text-sm font-black text-[#1A1D1F] font-mono">
                        {formatLKR(r.total_cost || 0)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#7C828D] font-medium block">
                        Menu Selling Price
                      </span>
                      <span className="text-sm font-black text-[#119C49] font-mono">
                        {formatLKR(r.selling_price || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Ingredient BOM List */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#7C828D] block uppercase tracking-wider">
                      Ingredients (Auto-Deducted)
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {(r.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-white border border-[#EBECEF]"
                        >
                          <span className="font-medium text-[#1A1D1F]">
                            {it.ingredient_name}
                          </span>
                          <span className="font-mono text-[#7C828D]">
                            {it.quantity} {it.unit} &bull; {formatLKR(it.subtotal_cost || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#F4F5F7] flex items-center justify-end">
                  <Button
                    variant="outline"
                    onClick={() => openEditRecipeModal(r)}
                    className="rounded-xl border-[#EBECEF] text-[#119C49] hover:bg-[#D1F0DC]/20 h-9 px-3 gap-1.5 text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit BOM</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Recipe Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F] flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#119C49]" />
              {editingRecipe ? 'Edit Recipe (BOM)' : 'Create New BOM Recipe'}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Dish Selection */}
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Menu Item Dish
              </label>
              <select
                value={selectedMenuItemId}
                onChange={(e) => {
                  setSelectedMenuItemId(e.target.value);
                  setSelectedVariantId('');
                }}
                disabled={!!editingRecipe}
                className="w-full h-11 px-3.5 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#119C49]"
              >
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({formatLKR(m.base_price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Variant / Portion Selection */}
            {selectedItem?.item_variants && selectedItem.item_variants.length > 0 && (
              <div>
                <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                  Portion / Variant (Optional)
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={!!editingRecipe}
                  className="w-full h-11 px-3.5 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#119C49]"
                >
                  <option value="">All Portions (Default Recipe)</option>
                  {selectedItem.item_variants.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.variant_name} ({formatLKR(v.price_override || selectedItem.base_price)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Financial Margin Meter */}
            <div className="p-4 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF] grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-[#7C828D] block">Selling Price</span>
                <span className="text-xs font-black text-[#119C49] font-mono">
                  {formatLKR(currentSellingPrice)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#7C828D] block">Est. Food Cost</span>
                <span className="text-xs font-black text-[#1A1D1F] font-mono">
                  {formatLKR(computedModalFoodCost)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#7C828D] block">Gross Margin</span>
                <span
                  className={`text-xs font-black font-mono ${
                    computedModalMargin >= 70
                      ? 'text-[#119C49]'
                      : computedModalMargin >= 50
                      ? 'text-[#F59E0B]'
                      : 'text-red-500'
                  }`}
                >
                  {computedModalMargin}%
                </span>
              </div>
            </div>

            {/* Ingredient Rows (BOM) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1D1F]">
                  Ingredients & Quantities (Per 1 Dish)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddIngredientRow}
                  className="h-8 rounded-xl border-[#EBECEF] text-[#119C49] hover:bg-[#D1F0DC]/20 text-[11px] gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Ingredient</span>
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bomRows.map((row, idx) => {
                  const ing = ingredients.find((i) => i.id === row.ingredient_id);
                  const lineCost = (ing?.unit_cost || 0) * row.quantity;

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF]"
                    >
                      <select
                        value={row.ingredient_id}
                        onChange={(e) => handleRowIngredientChange(idx, e.target.value)}
                        className="flex-1 h-9 px-2.5 bg-white border border-[#EBECEF] rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({formatLKR(i.unit_cost)}/{i.unit})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 w-28">
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={row.quantity}
                          onChange={(e) => handleRowQuantityChange(idx, e.target.value)}
                          className="h-9 bg-white border-[#EBECEF] rounded-xl text-xs font-mono text-right"
                        />
                        <span className="text-xs font-bold text-[#7C828D] w-8">
                          {row.unit}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-[#1A1D1F] font-mono w-20 text-right">
                        {formatLKR(lineCost)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientRow(idx)}
                        disabled={bomRows.length <= 1}
                        className="p-1.5 text-[#7C828D] hover:text-red-500 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-[#1A1D1F] block mb-1">
                Chef / Recipe Notes (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Standard 1-person portion, wok high heat"
                value={recipeNotes}
                onChange={(e) => setRecipeNotes(e.target.value)}
                className="h-10 bg-[#F6F7F9] border-[#EBECEF] rounded-2xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-2xl border-[#EBECEF] text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRecipe}
              disabled={isSaving}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white text-xs font-bold"
            >
              {isSaving ? 'Saving BOM...' : 'Save Recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
