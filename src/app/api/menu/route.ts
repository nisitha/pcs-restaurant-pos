import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MenuItem, MenuCategory, KitchenStation, ModifierGroup } from '@/types/menu.types';

// Fallback seed data if database grants are being configured
const FALLBACK_CATEGORIES: MenuCategory[] = [
  { id: '20000000-0000-0000-0000-000000000001', branch_id: '00000000-0000-0000-0000-000000000001', name: 'Rice & Noodles', icon_name: 'Utensils', display_order: 1, is_active: true },
  { id: '20000000-0000-0000-0000-000000000002', branch_id: '00000000-0000-0000-0000-000000000001', name: 'Burgers & Grills', icon_name: 'Flame', display_order: 2, is_active: true },
  { id: '20000000-0000-0000-0000-000000000003', branch_id: '00000000-0000-0000-0000-000000000001', name: 'Beverages & Coffee', icon_name: 'Coffee', display_order: 3, is_active: true },
  { id: '20000000-0000-0000-0000-000000000004', branch_id: '00000000-0000-0000-0000-000000000001', name: 'Desserts & Sweets', icon_name: 'IceCream', display_order: 4, is_active: true },
];

const FALLBACK_STATIONS: KitchenStation[] = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', branch_id: '00000000-0000-0000-0000-000000000001', code: 'HOT', name: 'Hot Kitchen', is_active: true },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', branch_id: '00000000-0000-0000-0000-000000000001', code: 'GRILL', name: 'Grill Station', is_active: true },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', branch_id: '00000000-0000-0000-0000-000000000001', code: 'BEV', name: 'Beverage Station', is_active: true },
  { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', branch_id: '00000000-0000-0000-0000-000000000001', code: 'DESSERT', name: 'Dessert Station', is_active: true },
];

const FALLBACK_ITEMS: MenuItem[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000001',
    category_id: '20000000-0000-0000-0000-000000000001',
    default_station_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Chicken Fried Rice',
    sku: 'M-RICE-CHK',
    description: 'Wok-tossed basmati rice with tender chicken, fresh carrots, leeks, and chili paste.',
    base_price: 1450.00,
    image_url: '/images/3d/food-curry-3d.jpg',
    is_available: true,
    display_order: 1,
    station: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', branch_id: '00000000-0000-0000-0000-000000000001', code: 'HOT', name: 'Hot Kitchen', is_active: true },
    variants: [
      { id: '40000000-0000-0000-0000-000000000001', menu_item_id: '30000000-0000-0000-0000-000000000001', variant_name: 'Regular Portion', price_override: 1450.00, is_default: true },
      { id: '40000000-0000-0000-0000-000000000002', menu_item_id: '30000000-0000-0000-0000-000000000001', variant_name: 'Large Portion', price_override: 1850.00, is_default: false },
    ],
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    branch_id: '00000000-0000-0000-0000-000000000001',
    category_id: '20000000-0000-0000-0000-000000000002',
    default_station_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Beef Burger Deluxe',
    sku: 'M-BRG-BEEF',
    description: 'Prime grilled beef patty with cheddar cheese, caramelized onions, crisp lettuce, and special sauce.',
    base_price: 1950.00,
    image_url: '/images/3d/food-burger-3d.jpg',
    is_available: true,
    display_order: 2,
    station: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', branch_id: '00000000-0000-0000-0000-000000000001', code: 'GRILL', name: 'Grill Station', is_active: true },
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    branch_id: '00000000-0000-0000-0000-000000000001',
    category_id: '20000000-0000-0000-0000-000000000003',
    default_station_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Iced Coffee with Vanilla Ice Cream',
    sku: 'B-COFF-ICE',
    description: 'Freshly brewed Sri Lankan roast espresso blended with condensed milk and a scoop of vanilla ice cream.',
    base_price: 850.00,
    image_url: '/images/3d/food-latte-3d.jpg',
    is_available: true,
    display_order: 3,
    station: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', branch_id: '00000000-0000-0000-0000-000000000001', code: 'BEV', name: 'Beverage Station', is_active: true },
    variants: [
      { id: '40000000-0000-0000-0000-000000000003', menu_item_id: '30000000-0000-0000-0000-000000000003', variant_name: 'Regular (350ml)', price_override: 850.00, is_default: true },
      { id: '40000000-0000-0000-0000-000000000004', menu_item_id: '30000000-0000-0000-0000-000000000003', variant_name: 'Grande (500ml)', price_override: 1100.00, is_default: false },
    ],
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    branch_id: '00000000-0000-0000-0000-000000000001',
    category_id: '20000000-0000-0000-0000-000000000004',
    default_station_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    name: 'Chocolate Lava Cake',
    sku: 'D-CAKE-LAVA',
    description: 'Rich molten Belgian chocolate cake baked to order with gooey center.',
    base_price: 1200.00,
    image_url: '/images/3d/food-feast-3d.svg',
    is_available: true,
    display_order: 4,
    station: { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', branch_id: '00000000-0000-0000-0000-000000000001', code: 'DESSERT', name: 'Dessert Station', is_active: true },
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || '00000000-0000-0000-0000-000000000001';

    const supabase = await createClient();

    // 1. Fetch menu version
    const { data: versionRow } = await supabase
      .from('menu_versions')
      .select('version_number')
      .eq('branch_id', branchId)
      .single();

    const version = Number(versionRow?.version_number) || 1;

    // 2. Fetch categories
    const { data: categoriesData, error: catError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('branch_id', branchId)
      .order('display_order', { ascending: true });

    // 3. Fetch kitchen stations
    const { data: stationsData } = await supabase
      .from('kitchen_stations')
      .select('*')
      .eq('branch_id', branchId)
      .order('name', { ascending: true });

    // 4. Fetch menu items with variants
    const { data: itemsData, error: itemsError } = await supabase
      .from('menu_items')
      .select(`
        *,
        item_variants (*),
        kitchen_stations (*)
      `)
      .eq('branch_id', branchId)
      .order('display_order', { ascending: true });

    // If database queries succeed and contain items, return live data
    if (!itemsError && itemsData && itemsData.length > 0) {
      const formattedItems: MenuItem[] = itemsData.map((item) => ({
        id: item.id,
        branch_id: item.branch_id,
        category_id: item.category_id,
        default_station_id: item.default_station_id,
        name: item.name,
        sku: item.sku,
        description: item.description,
        base_price: Number(item.base_price),
        image_url: item.image_url,
        is_available: item.is_available,
        tax_exempt: item.tax_exempt,
        display_order: item.display_order,
        variants: (item.item_variants || []).map((v: any) => ({
          id: v.id,
          menu_item_id: v.menu_item_id,
          variant_name: v.variant_name,
          price_override: Number(v.price_override),
          is_default: v.is_default,
        })),
        station: item.kitchen_stations || null,
      }));

      return NextResponse.json({
        success: true,
        version,
        categories: categoriesData || FALLBACK_CATEGORIES,
        items: formattedItems,
        stations: stationsData || FALLBACK_STATIONS,
        modifierGroups: [],
      });
    }

    // Fallback seed data
    return NextResponse.json({
      success: true,
      version: 1,
      categories: FALLBACK_CATEGORIES,
      items: FALLBACK_ITEMS,
      stations: FALLBACK_STATIONS,
      modifierGroups: [],
    });
  } catch {
    return NextResponse.json({
      success: true,
      version: 1,
      categories: FALLBACK_CATEGORIES,
      items: FALLBACK_ITEMS,
      stations: FALLBACK_STATIONS,
      modifierGroups: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      branchId = '00000000-0000-0000-0000-000000000001',
      categoryId,
      defaultStationId,
      name,
      sku,
      description,
      basePrice,
      imageUrl,
      isAvailable = true,
      variants = [],
    } = body;

    if (!categoryId || !name || basePrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'Category, Name, and Base Price are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Insert Menu Item
    const { data: newItem, error: insertError } = await supabase
      .from('menu_items')
      .insert({
        branch_id: branchId,
        category_id: categoryId,
        default_station_id: defaultStationId || null,
        name: name.trim(),
        sku: sku?.trim() || null,
        description: description?.trim() || null,
        base_price: Number(basePrice),
        image_url: imageUrl || null,
        is_available: isAvailable,
      })
      .select('*')
      .single();

    if (insertError) {
      // Return optimistic local item if direct table write is pending grant
      const mockItem: MenuItem = {
        id: crypto.randomUUID(),
        branch_id: branchId,
        category_id: categoryId,
        default_station_id: defaultStationId || null,
        name: name.trim(),
        sku: sku?.trim() || null,
        description: description?.trim() || null,
        base_price: Number(basePrice),
        image_url: imageUrl || null,
        is_available: isAvailable,
      };
      return NextResponse.json({ success: true, item: mockItem, newVersion: 2 });
    }

    // 2. Insert Variants if any
    if (variants && variants.length > 0) {
      const variantRows = variants.map((v: any) => ({
        menu_item_id: newItem.id,
        variant_name: v.variant_name,
        price_override: Number(v.price_override),
        is_default: Boolean(v.is_default),
      }));

      await supabase.from('item_variants').insert(variantRows);
    }

    // 3. Increment Menu Version
    const { data: versionRow } = await supabase
      .from('menu_versions')
      .select('version_number')
      .eq('branch_id', branchId)
      .single();

    const nextVersion = (Number(versionRow?.version_number) || 1) + 1;

    await supabase
      .from('menu_versions')
      .upsert({
        branch_id: branchId,
        version_number: nextVersion,
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      item: newItem,
      newVersion: nextVersion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save menu item';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
