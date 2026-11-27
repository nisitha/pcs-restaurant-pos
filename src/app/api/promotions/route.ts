import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: promotions, error } = await supabase
      .from('promotions')
      .select(`
        id,
        branch_id,
        name,
        code,
        promo_type,
        discount_value,
        min_order_amount,
        applies_to_category_id,
        schedule_start_time,
        schedule_end_time,
        days_of_week,
        is_active,
        created_at,
        updated_at,
        category:menu_categories (
          id,
          name
        ),
        combo_items (
          id,
          promotion_id,
          menu_item_id,
          quantity,
          menu_item:menu_items (
            id,
            name,
            base_price
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, promotions: promotions || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const {
      id,
      name,
      code,
      promo_type,
      discount_value,
      min_order_amount = 0,
      applies_to_category_id,
      schedule_start_time,
      schedule_end_time,
      days_of_week,
      is_active = true,
      combo_items = [],
    } = body;

    if (!name || !promo_type || discount_value === undefined) {
      return NextResponse.json({ success: false, message: 'Name, promo type, and discount value are required' }, { status: 400 });
    }

    const branchId = '00000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();

    if (id) {
      const { data, error } = await supabase
        .from('promotions')
        .update({
          name,
          code: code || null,
          promo_type,
          discount_value: Number(discount_value),
          min_order_amount: Number(min_order_amount),
          applies_to_category_id: applies_to_category_id || null,
          schedule_start_time: schedule_start_time || null,
          schedule_end_time: schedule_end_time || null,
          days_of_week: days_of_week || [0, 1, 2, 3, 4, 5, 6],
          is_active: is_active ?? true,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      // Update combo items if provided
      if (promo_type === 'combo_deal') {
        await supabase.from('combo_items').delete().eq('promotion_id', id);
        if (combo_items.length > 0) {
          const rows = combo_items.map((ci: any) => ({
            promotion_id: id,
            menu_item_id: ci.menu_item_id,
            quantity: ci.quantity || 1,
          }));
          await supabase.from('combo_items').insert(rows);
        }
      }

      return NextResponse.json({ success: true, promotion: data });
    } else {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          branch_id: branchId,
          name,
          code: code || null,
          promo_type,
          discount_value: Number(discount_value),
          min_order_amount: Number(min_order_amount),
          applies_to_category_id: applies_to_category_id || null,
          schedule_start_time: schedule_start_time || null,
          schedule_end_time: schedule_end_time || null,
          days_of_week: days_of_week || [0, 1, 2, 3, 4, 5, 6],
          is_active: is_active ?? true,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }

      if (promo_type === 'combo_deal' && combo_items.length > 0) {
        const rows = combo_items.map((ci: any) => ({
          promotion_id: data.id,
          menu_item_id: ci.menu_item_id,
          quantity: ci.quantity || 1,
        }));
        await supabase.from('combo_items').insert(rows);
      }

      return NextResponse.json({ success: true, promotion: data });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
