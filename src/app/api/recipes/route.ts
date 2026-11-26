import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch recipes with menu items, variants, and recipe items
    const { data: recipes, error: recipesErr } = await supabase
      .from('recipes')
      .select(`
        id,
        menu_item_id,
        variant_id,
        yield_quantity,
        notes,
        created_at,
        updated_at,
        menu_item:menu_items (
          id,
          name,
          base_price
        ),
        variant:item_variants (
          id,
          variant_name,
          price_override
        ),
        recipe_items (
          id,
          recipe_id,
          ingredient_id,
          quantity,
          unit,
          ingredient:ingredients (
            id,
            name,
            unit,
            unit_cost
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (recipesErr) {
      return NextResponse.json({ success: false, message: recipesErr.message }, { status: 400 });
    }

    // Enrich with calculated food cost and margin
    const enriched = (recipes || []).map((r: any) => {
      const items = (r.recipe_items || []).map((ri: any) => {
        const ing = ri.ingredient || {};
        const unitCost = Number(ing.unit_cost || 0);
        const qty = Number(ri.quantity || 0);
        const subtotal = Math.round(qty * unitCost * 100) / 100;
        return {
          id: ri.id,
          ingredient_id: ri.ingredient_id,
          ingredient_name: ing.name || 'Unknown',
          quantity: qty,
          unit: ri.unit,
          unit_cost: unitCost,
          subtotal_cost: subtotal,
        };
      });

      const totalCost = items.reduce((sum: number, it: any) => sum + it.subtotal_cost, 0);
      const menuItem = r.menu_item || {};
      const variant = r.variant || {};
      const sellingPrice = Number(variant.price_override || menuItem.base_price || 0);
      const margin = sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 1000) / 10 : 0;

      return {
        ...r,
        items,
        total_cost: Math.round(totalCost * 100) / 100,
        selling_price: sellingPrice,
        gross_margin_percent: margin,
      };
    });

    return NextResponse.json({ success: true, recipes: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { menu_item_id, variant_id, yield_quantity = 1, notes, items } = body;

    if (!menu_item_id) {
      return NextResponse.json({ success: false, message: 'menu_item_id is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one ingredient item is required in recipe' }, { status: 400 });
    }

    // Upsert parent recipe
    const { data: recipeData, error: recipeErr } = await supabase
      .from('recipes')
      .upsert(
        {
          menu_item_id,
          variant_id: variant_id || null,
          yield_quantity: Number(yield_quantity) || 1,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'menu_item_id, variant_id' }
      )
      .select()
      .single();

    if (recipeErr || !recipeData) {
      return NextResponse.json({ success: false, message: recipeErr?.message || 'Failed to save recipe' }, { status: 400 });
    }

    const recipeId = recipeData.id;

    // Delete existing recipe items to cleanly overwrite with new items
    await supabase.from('recipe_items').delete().eq('recipe_id', recipeId);

    // Insert new recipe items
    const rowsToInsert = items.map((it: any) => ({
      recipe_id: recipeId,
      ingredient_id: it.ingredient_id,
      quantity: Number(it.quantity),
      unit: it.unit || 'g',
    }));

    const { error: itemsErr } = await supabase.from('recipe_items').insert(rowsToInsert);

    if (itemsErr) {
      return NextResponse.json({ success: false, message: itemsErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, recipe_id: recipeId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
