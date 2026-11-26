import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    const enriched = (ingredients || []).map((ing: any) => {
      const current = Number(ing.current_stock || 0);
      const minLevel = Number(ing.min_stock_level || 0);
      const unitCost = Number(ing.unit_cost || 0);
      const valuation = Math.round(current * unitCost * 100) / 100;

      let status = 'in_stock';
      if (current <= 0) {
        status = 'out_of_stock';
      } else if (current <= minLevel) {
        status = 'low_stock';
      }

      return {
        ...ing,
        current_stock: current,
        min_stock_level: minLevel,
        unit_cost: unitCost,
        valuation,
        status,
      };
    });

    return NextResponse.json({ success: true, ingredients: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id, name, sku, unit, current_stock = 0, min_stock_level = 5, unit_cost = 0, category = 'general' } = body;

    if (!name || !unit) {
      return NextResponse.json({ success: false, message: 'Name and unit are required' }, { status: 400 });
    }

    // Default branch ID
    const branchId = '00000000-0000-0000-0000-000000000001';

    if (id) {
      // Update
      const { data, error } = await supabase
        .from('ingredients')
        .update({
          name,
          sku: sku || null,
          unit,
          current_stock: Number(current_stock),
          min_stock_level: Number(min_stock_level),
          unit_cost: Number(unit_cost),
          category: category || 'general',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, ingredient: data });
    } else {
      // Create
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          branch_id: branchId,
          name,
          sku: sku || null,
          unit,
          current_stock: Number(current_stock),
          min_stock_level: Number(min_stock_level),
          unit_cost: Number(unit_cost),
          category: category || 'general',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, ingredient: data });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
