import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { items = [], subtotal = 0, promo_code } = body;

    // Fetch all active promotions with combo items
    const { data: promotions, error } = await supabase
      .from('promotions')
      .select(`
        id,
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
        combo_items (
          menu_item_id,
          quantity
        )
      `)
      .eq('is_active', true);

    if (error || !promotions) {
      return NextResponse.json({ success: true, discounts: [], total_discount: 0 });
    }

    const now = new Date();
    // Sri Lanka Time (Asia/Colombo UTC+5:30)
    const slTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour12: false });
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday ...

    const applicableDiscounts: Array<{
      promotion_id: string;
      name: string;
      discount_amount: number;
      type: string;
    }> = [];

    for (const promo of promotions) {
      // Check code matching if code specified
      if (promo.code && promo_code && promo.code.toUpperCase() !== promo_code.trim().toUpperCase()) {
        continue;
      }

      // Check min order amount
      if (subtotal < Number(promo.min_order_amount || 0)) {
        continue;
      }

      // Check day of week
      if (promo.days_of_week && Array.isArray(promo.days_of_week) && promo.days_of_week.length > 0) {
        if (!promo.days_of_week.includes(currentDay)) {
          continue;
        }
      }

      // Check time window (Happy hour schedule)
      if (promo.schedule_start_time && promo.schedule_end_time) {
        if (slTimeStr < promo.schedule_start_time || slTimeStr > promo.schedule_end_time) {
          continue;
        }
      }

      // Calculate discount amount based on promo_type
      let discountAmount = 0;

      if (promo.promo_type === 'happy_hour') {
        // Applies percentage discount to items in category
        if (promo.applies_to_category_id) {
          const eligibleItems = items.filter(
            (i: any) => i.category_id === promo.applies_to_category_id
          );
          const eligibleSubtotal = eligibleItems.reduce(
            (sum: number, it: any) => sum + it.unit_price * it.quantity,
            0
          );
          discountAmount = Math.round((eligibleSubtotal * (promo.discount_value / 100)) * 100) / 100;
        } else {
          discountAmount = Math.round((subtotal * (promo.discount_value / 100)) * 100) / 100;
        }
      } else if (promo.promo_type === 'percentage') {
        discountAmount = Math.round((subtotal * (promo.discount_value / 100)) * 100) / 100;
      } else if (promo.promo_type === 'fixed_amount') {
        discountAmount = Math.min(subtotal, Number(promo.discount_value));
      } else if (promo.promo_type === 'combo_deal') {
        // Check if cart contains all combo items
        const comboRules = promo.combo_items || [];
        const hasAll = comboRules.every((rule: any) => {
          const found = items.find((it: any) => it.menu_item_id === rule.menu_item_id);
          return found && found.quantity >= rule.quantity;
        });

        if (hasAll && comboRules.length > 0) {
          discountAmount = Number(promo.discount_value);
        }
      }

      if (discountAmount > 0) {
        applicableDiscounts.push({
          promotion_id: promo.id,
          name: promo.name,
          discount_amount: discountAmount,
          type: promo.promo_type,
        });
      }
    }

    const totalDiscount = applicableDiscounts.reduce((sum, d) => sum + d.discount_amount, 0);

    return NextResponse.json({
      success: true,
      discounts: applicableDiscounts,
      total_discount: totalDiscount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
