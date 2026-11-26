-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - SEED DATA MIGRATION
-- Migration: 002_seed_data.sql
-- Description: Idempotent seed data for Branch, Staff PINs, Kitchen Stations,
--              Tables, Menu Categories, Items, Variants, and Modifiers.
-- ============================================================================

-- Ensure pgcrypto is enabled for PIN hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Relax foreign key on user_profiles if strict auth.users was enforced,
-- allowing PIN-based POS staff accounts without mandatory Supabase auth users
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Ensure read access on user_profiles for staff lookup & PIN verification
DO $$ BEGIN
    CREATE POLICY allow_read_user_profiles ON user_profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. DEFAULT RESTAURANT BRANCH
INSERT INTO branches (id, code, name, address, phone, currency, timezone, tax_rate, service_charge_rate, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'MAIN-COLOMBO',
    'Main Branch - Colombo',
    'No. 45 Galle Road, Colombo 03, Sri Lanka',
    '+94 11 254 7890',
    'LKR',
    'Asia/Colombo',
    0.00,
    10.00,
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    currency = EXCLUDED.currency,
    timezone = EXCLUDED.timezone,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone;

-- Ensure branch menu version is initialized
INSERT INTO menu_versions (branch_id, version_number)
VALUES ('00000000-0000-0000-0000-000000000001', 1)
ON CONFLICT (branch_id) DO NOTHING;

-- 2. KITCHEN STATIONS
INSERT INTO kitchen_stations (id, branch_id, code, name, is_active)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'HOT', 'Hot Kitchen', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'GRILL', 'Grill Station', true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'BEV', 'Beverage Station', true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'DESSERT', 'Dessert Station', true)
ON CONFLICT (branch_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- 3. STAFF USERS WITH 4-DIGIT PINs
-- PIN Map:
-- Owner:   1111
-- Manager: 2222
-- Cashier: 3333
-- Waiter:  4444
-- Chef:    5555
INSERT INTO user_profiles (id, branch_id, role, display_name, pin_code_hash, phone, is_active)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001',
        'owner',
        'Kasun Perera (Owner)',
        crypt('1111', gen_salt('bf')),
        '+94 77 123 4567',
        true
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000001',
        'manager',
        'Dilshan Silva (Manager)',
        crypt('2222', gen_salt('bf')),
        '+94 77 234 5678',
        true
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000001',
        'cashier',
        'Nimasha Fernando (Cashier)',
        crypt('3333', gen_salt('bf')),
        '+94 77 345 6789',
        true
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000001',
        'waiter',
        'Sahan Jayawardena (Waiter)',
        crypt('4444', gen_salt('bf')),
        '+94 77 456 7890',
        true
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000001',
        'chef',
        'Chef Kumara (Kitchen)',
        crypt('5555', gen_salt('bf')),
        '+94 77 567 8901',
        true
    )
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    pin_code_hash = EXCLUDED.pin_code_hash,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;

-- 4. RESTAURANT FLOOR & TABLES (T1 to T8)
INSERT INTO restaurant_floors (id, branch_id, name, display_order)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Main Dining Hall', 1)
ON CONFLICT DO NOTHING;

INSERT INTO dining_tables (id, branch_id, floor_id, table_number, seating_capacity, status, pos_x, pos_y, is_active)
VALUES 
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T1', 4, 'available', 40, 40, true),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T2', 4, 'available', 160, 40, true),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T3', 2, 'available', 280, 40, true),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T4', 6, 'available', 400, 40, true),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T5', 4, 'available', 40, 160, true),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T6', 2, 'available', 160, 160, true),
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T7', 8, 'available', 280, 160, true),
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T8', 4, 'available', 400, 160, true)
ON CONFLICT (branch_id, table_number) DO UPDATE SET
    seating_capacity = EXCLUDED.seating_capacity,
    status = EXCLUDED.status,
    pos_x = EXCLUDED.pos_x,
    pos_y = EXCLUDED.pos_y,
    is_active = EXCLUDED.is_active;

-- 5. MENU CATEGORIES
INSERT INTO menu_categories (id, branch_id, name, icon_name, display_order, is_active)
VALUES 
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Rice & Noodles', 'Utensils', 1, true),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Burgers & Grills', 'Flame', 2, true),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Beverages & Coffee', 'Coffee', 3, true),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Desserts & Sweets', 'IceCream', 4, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon_name = EXCLUDED.icon_name,
    display_order = EXCLUDED.display_order;

-- 6. MENU ITEMS IN LKR
INSERT INTO menu_items (id, branch_id, category_id, default_station_id, name, sku, description, base_price, is_available, display_order)
VALUES 
    (
        '30000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Hot Kitchen
        'Chicken Fried Rice',
        'M-RICE-CHK',
        'Wok-tossed basmati rice with tender chicken, fresh carrots, leeks, and chili paste.',
        1450.00,
        true,
        1
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Grill Station
        'Beef Burger Deluxe',
        'M-BRG-BEEF',
        'Prime grilled beef patty with cheddar cheese, caramelized onions, crisp lettuce, and special sauce.',
        1950.00,
        true,
        2
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000003',
        'cccccccc-cccc-cccc-cccc-cccccccccccc', -- Beverage Station
        'Iced Coffee with Vanilla Ice Cream',
        'B-COFF-ICE',
        'Freshly brewed Sri Lankan roast espresso blended with condensed milk and a scoop of vanilla ice cream.',
        850.00,
        true,
        3
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000004',
        'dddddddd-dddd-dddd-dddd-dddddddddddd', -- Dessert Station
        'Chocolate Lava Cake',
        'D-CAKE-LAVA',
        'Rich molten Belgian chocolate cake baked to order with gooey center.',
        1200.00,
        true,
        4
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    base_price = EXCLUDED.base_price,
    default_station_id = EXCLUDED.default_station_id,
    description = EXCLUDED.description;

-- 7. ITEM VARIANTS (PORTIONS & SIZES)
INSERT INTO item_variants (id, menu_item_id, variant_name, price_override, is_default)
VALUES 
    -- Chicken Fried Rice Variants
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Regular Portion', 1450.00, true),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Large Portion', 1850.00, false),
    -- Iced Coffee Variants
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Regular (350ml)', 850.00, true),
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', 'Grande (500ml)', 1100.00, false)
ON CONFLICT (id) DO UPDATE SET
    variant_name = EXCLUDED.variant_name,
    price_override = EXCLUDED.price_override,
    is_default = EXCLUDED.is_default;

-- 8. MODIFIER GROUPS & MODIFIERS
INSERT INTO modifier_groups (id, branch_id, title, min_selection, max_selection)
VALUES 
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Spice Level', 1, 1),
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Burger Add-Ons', 0, 3),
    ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Dessert Toppings', 0, 2)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    min_selection = EXCLUDED.min_selection,
    max_selection = EXCLUDED.max_selection;

INSERT INTO modifiers (id, group_id, name, price_addition)
VALUES 
    -- Spice Level Modifiers
    ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Mild', 0.00),
    ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Medium Spicy', 0.00),
    ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Extra Hot & Spicy', 50.00),
    -- Burger Add-ons
    ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 'Extra Cheddar Cheese Slice', 250.00),
    ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002', 'Crispy Beef Bacon', 350.00),
    ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000002', 'Fried Egg', 150.00),
    -- Dessert Topping
    ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000003', 'Scoop of Vanilla Gelato', 250.00),
    ('60000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000003', 'Whipped Cream & Strawberries', 300.00)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_addition = EXCLUDED.price_addition;

-- Link Modifiers to Menu Items
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
VALUES 
    ('30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'), -- Fried Rice -> Spice Level
    ('30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002'), -- Burger -> Burger Add-ons
    ('30000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003')  -- Lava Cake -> Dessert Topping
ON CONFLICT DO NOTHING;

-- 9. PIN VERIFICATION & ACTIVE STAFF RPC PROCEDURES
CREATE OR REPLACE FUNCTION verify_staff_pin(
    p_pin TEXT,
    p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    display_name VARCHAR,
    role user_role,
    branch_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_branch UUID := p_branch_id;
BEGIN
    IF v_target_branch IS NULL THEN
        SELECT id INTO v_target_branch FROM branches WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT up.id, up.display_name, up.role, up.branch_id
    FROM user_profiles up
    WHERE up.branch_id = v_target_branch
      AND up.is_active = TRUE
      AND up.pin_code_hash = crypt(p_pin, up.pin_code_hash);
END;
$$;

CREATE OR REPLACE FUNCTION get_active_staff_list(p_branch_id UUID DEFAULT NULL)
RETURNS TABLE (
    user_id UUID,
    display_name VARCHAR,
    role user_role,
    branch_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_branch UUID := p_branch_id;
BEGIN
    IF v_target_branch IS NULL THEN
        SELECT id INTO v_target_branch FROM branches WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT up.id, up.display_name, up.role, up.branch_id
    FROM user_profiles up
    WHERE up.branch_id = v_target_branch
      AND up.is_active = TRUE
    ORDER BY 
        CASE up.role
            WHEN 'owner' THEN 1
            WHEN 'manager' THEN 2
            WHEN 'cashier' THEN 3
            WHEN 'waiter' THEN 4
            WHEN 'chef' THEN 5
            ELSE 6
        END,
        up.display_name ASC;
END;
$$;

-- Grant RPC execution permissions to anonymous & authenticated sessions
GRANT EXECUTE ON FUNCTION verify_staff_pin(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_staff_list(UUID) TO anon, authenticated, service_role;
