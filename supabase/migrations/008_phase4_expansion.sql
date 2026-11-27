-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - PHASE 4: EXPANSION & MULTI-BRANCH
-- Migration: 008_phase4_expansion.sql
-- Description: Multi-Branch Management, Inter-Branch Stock Transfers,
--              Delivery Riders & Dispatch Tracking, Table QR Ordering,
--              Public Online Storefront, and Realtime Publications.
-- ============================================================================

-- 1. RELAX CONSTRAINTS ON ORDERS & AUDIT LOGS FOR SELF-ORDERING (TABLE QR & ONLINE)
-- Allow cashier_id and shift_id to be nullable so guests can order without cashier session
ALTER TABLE orders ALTER COLUMN cashier_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN shift_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN reason DROP NOT NULL;

-- Add Phase 4 columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(30) DEFAULT 'pos' NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_rider_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_time TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_staff_approval BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Ensure dining_tables has updated_at
ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW());

-- 2. DELIVERY RIDERS TABLE
CREATE TABLE IF NOT EXISTS delivery_riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(30) DEFAULT 'bike' NOT NULL, -- 'bike', 'scooter', 'car', 'van'
    vehicle_plate VARCHAR(30),
    status VARCHAR(30) DEFAULT 'available' NOT NULL,  -- 'available', 'on_delivery', 'offline'
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Foreign key on orders for rider
DO $$ BEGIN
    ALTER TABLE orders 
    ADD CONSTRAINT fk_orders_delivery_rider 
    FOREIGN KEY (delivery_rider_id) REFERENCES delivery_riders(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. INTER-BRANCH STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS inter_branch_stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) NOT NULL,
    from_branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    to_branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' NOT NULL, -- 'pending', 'completed', 'cancelled'
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    received_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_different_branches CHECK (from_branch_id != to_branch_id)
);

CREATE TABLE IF NOT EXISTS inter_branch_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID REFERENCES inter_branch_stock_transfers(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add reference_transfer_id to stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_transfer_id UUID REFERENCES inter_branch_stock_transfers(id) ON DELETE SET NULL;

-- 4. ATOMIC INTER-BRANCH STOCK TRANSFER PROCESSOR RPC
CREATE OR REPLACE FUNCTION process_inter_branch_transfer(
    p_transfer_id UUID,
    p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_item RECORD;
    v_src_ing RECORD;
    v_dest_ing_id UUID;
    v_dest_ing RECORD;
BEGIN
    -- 1. Fetch Transfer
    SELECT * INTO v_transfer
    FROM inter_branch_stock_transfers
    WHERE id = p_transfer_id;

    IF v_transfer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer not found');
    END IF;

    IF v_transfer.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer is already ' || v_transfer.status);
    END IF;

    -- 2. Process Each Item
    FOR v_item IN
        SELECT ti.*, i.name as ing_name, i.unit as ing_unit, i.current_stock as src_stock, i.unit_cost as ing_cost
        FROM inter_branch_transfer_items ti
        JOIN ingredients i ON ti.ingredient_id = i.id
        WHERE ti.transfer_id = p_transfer_id
    LOOP
        -- Check source has enough stock
        IF v_item.src_stock < v_item.quantity THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Insufficient stock for ' || v_item.ing_name || ' in source branch'
            );
        END IF;

        -- Deduct from Source Branch
        UPDATE ingredients
        SET current_stock = current_stock - v_item.quantity,
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = v_item.ingredient_id;

        -- Ledger Source Deduction
        INSERT INTO stock_movements (
            branch_id,
            ingredient_id,
            movement_type,
            quantity,
            unit_cost,
            reference_transfer_id,
            idempotent_key,
            notes,
            created_by
        ) VALUES (
            v_transfer.from_branch_id,
            v_item.ingredient_id,
            'branch_transfer',
            -v_item.quantity,
            v_item.unit_cost,
            p_transfer_id,
            'TRF-' || p_transfer_id || '-' || v_item.ingredient_id || '-SRC',
            'Transferred to branch: ' || v_transfer.to_branch_id,
            p_staff_id
        );

        -- Find or Create matching ingredient in Destination Branch
        SELECT id, current_stock INTO v_dest_ing
        FROM ingredients
        WHERE branch_id = v_transfer.to_branch_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(v_item.ing_name))
        LIMIT 1;

        IF v_dest_ing.id IS NOT NULL THEN
            UPDATE ingredients
            SET current_stock = current_stock + v_item.quantity,
                unit_cost = v_item.unit_cost,
                updated_at = TIMEZONE('utc', NOW())
            WHERE id = v_dest_ing.id;
            v_dest_ing_id := v_dest_ing.id;
        ELSE
            -- Auto-create ingredient in target branch
            INSERT INTO ingredients (
                branch_id,
                name,
                unit,
                current_stock,
                min_stock_level,
                unit_cost,
                category
            ) VALUES (
                v_transfer.to_branch_id,
                v_item.ing_name,
                v_item.ing_unit,
                v_item.quantity,
                5.000,
                v_item.unit_cost,
                'transferred'
            ) RETURNING id INTO v_dest_ing_id;
        END IF;

        -- Ledger Destination Addition
        INSERT INTO stock_movements (
            branch_id,
            ingredient_id,
            movement_type,
            quantity,
            unit_cost,
            reference_transfer_id,
            idempotent_key,
            notes,
            created_by
        ) VALUES (
            v_transfer.to_branch_id,
            v_dest_ing_id,
            'branch_transfer',
            v_item.quantity,
            v_item.unit_cost,
            p_transfer_id,
            'TRF-' || p_transfer_id || '-' || v_dest_ing_id || '-DEST',
            'Transferred from branch: ' || v_transfer.from_branch_id,
            p_staff_id
        );
    END LOOP;

    -- 3. Mark Transfer Completed
    UPDATE inter_branch_stock_transfers
    SET status = 'completed',
        received_by = p_staff_id,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Inter-branch stock transfer completed successfully'
    );
END;
$$;

-- 5. UPGRADED submit_pos_order WITH ORDER SOURCE & SELF-ORDER SUPPORT
CREATE OR REPLACE FUNCTION submit_pos_order(
    p_branch_id UUID,
    p_cashier_id UUID DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_order_type order_type DEFAULT 'dine_in',
    p_table_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 0.00,
    p_discount_amount NUMERIC DEFAULT 0.00,
    p_discount_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_order_source TEXT DEFAULT 'pos',
    p_requires_staff_approval BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_existing_num TEXT;
    v_existing_total NUMERIC;
    v_order_id UUID := uuid_generate_v4();
    v_order_number TEXT;
    v_customer_id UUID := NULL;
    v_subtotal NUMERIC := 0.00;
    v_service_charge NUMERIC := 0.00;
    v_tax_rate NUMERIC := 0.00;
    v_service_rate NUMERIC := 10.00;
    v_total_amount NUMERIC := 0.00;
    v_initial_kds_status kds_status := 'submitted';
    v_delivery_status TEXT := NULL;
    
    v_item JSONB;
    v_item_id UUID;
    v_menu_item_id UUID;
    v_variant_id UUID;
    v_item_name TEXT;
    v_unit_price NUMERIC;
    v_quantity INT;
    v_item_subtotal NUMERIC;
    v_station_id UUID;
    v_item_notes TEXT;
    v_mod JSONB;
    
    v_station_record RECORD;
    v_ticket_id UUID;
    v_ticket_number TEXT;
BEGIN
    -- A. Idempotency Check
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        SELECT id, order_number, total_amount INTO v_existing_id, v_existing_num, v_existing_total
        FROM orders
        WHERE idempotency_key = TRIM(p_idempotency_key);
        
        IF v_existing_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_id,
                'order_number', v_existing_num,
                'total_amount', v_existing_total,
                'is_duplicate', true,
                'message', 'Order already submitted (idempotent response)'
            );
        END IF;
    END IF;

    -- B. Fetch branch rates
    SELECT tax_rate, service_charge_rate INTO v_tax_rate, v_service_rate
    FROM branches WHERE id = p_branch_id;

    -- C. Handle Customer (if phone is provided)
    IF p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) != '' THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = TRIM(p_customer_phone) LIMIT 1;
        IF v_customer_id IS NULL AND p_customer_name IS NOT NULL THEN
            INSERT INTO customers (id, branch_id, name, phone, delivery_address)
            VALUES (uuid_generate_v4(), p_branch_id, TRIM(p_customer_name), TRIM(p_customer_phone), p_delivery_address)
            RETURNING id INTO v_customer_id;
        END IF;
    END IF;

    -- D. Calculate Subtotal from Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_quantity := (v_item->>'quantity')::INT;
        v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    END LOOP;

    -- Calculate Service Charge (applied only to Dine-in)
    IF p_order_type = 'dine_in' AND v_service_rate > 0 THEN
        v_service_charge := ROUND((v_subtotal * v_service_rate / 100.0), 2);
    END IF;

    -- Total: Subtotal - Discount + Service Charge + Delivery Fee
    v_total_amount := v_subtotal - COALESCE(p_discount_amount, 0.00) + v_service_charge + COALESCE(p_delivery_fee, 0.00);
    IF v_total_amount < 0 THEN
        v_total_amount := 0.00;
    END IF;

    -- E. Generate Unique Order Number
    v_order_number := generate_daily_order_number(p_branch_id);

    -- F. Determine Initial Status
    IF p_requires_staff_approval THEN
        v_initial_kds_status := 'draft';
    ELSE
        v_initial_kds_status := 'submitted';
    END IF;

    IF p_order_type = 'delivery' THEN
        v_delivery_status := 'preparing';
    END IF;

    -- G. Insert Parent Order
    INSERT INTO orders (
        id,
        branch_id,
        order_number,
        order_type,
        order_source,
        table_id,
        customer_id,
        customer_name,
        customer_phone,
        delivery_address,
        cashier_id,
        shift_id,
        kds_status,
        payment_status,
        subtotal,
        discount_amount,
        service_charge_amount,
        delivery_fee,
        total_amount,
        paid_amount,
        notes,
        idempotency_key,
        requires_staff_approval,
        delivery_status,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        p_branch_id,
        v_order_number,
        p_order_type,
        COALESCE(p_order_source, 'pos'),
        p_table_id,
        v_customer_id,
        p_customer_name,
        p_customer_phone,
        p_delivery_address,
        p_cashier_id,
        p_shift_id,
        v_initial_kds_status,
        'unpaid',
        v_subtotal,
        COALESCE(p_discount_amount, 0.00),
        v_service_charge,
        COALESCE(p_delivery_fee, 0.00),
        v_total_amount,
        0.00,
        p_notes,
        TRIM(p_idempotency_key),
        COALESCE(p_requires_staff_approval, false),
        v_delivery_status,
        TIMEZONE('utc', NOW()),
        TIMEZONE('utc', NOW())
    );

    -- H. Insert Order Items & Modifiers
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := uuid_generate_v4();
        v_menu_item_id := (v_item->>'menu_item_id')::UUID;
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_item_name := (v_item->>'item_name')::TEXT;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_quantity := (v_item->>'quantity')::INT;
        v_item_subtotal := v_unit_price * v_quantity;
        v_station_id := (v_item->>'station_id')::UUID;
        v_item_notes := (v_item->>'notes')::TEXT;

        -- Fallback default station
        IF v_station_id IS NULL THEN
            SELECT default_station_id INTO v_station_id FROM menu_items WHERE id = v_menu_item_id;
            IF v_station_id IS NULL THEN
                SELECT id INTO v_station_id FROM kitchen_stations WHERE branch_id = p_branch_id LIMIT 1;
            END IF;
        END IF;

        INSERT INTO order_items (
            id,
            order_id,
            branch_id,
            menu_item_id,
            variant_id,
            item_name,
            unit_price,
            quantity,
            subtotal,
            station_id,
            kds_status,
            notes,
            created_at
        ) VALUES (
            v_item_id,
            v_order_id,
            p_branch_id,
            v_menu_item_id,
            v_variant_id,
            v_item_name,
            v_unit_price,
            v_quantity,
            v_item_subtotal,
            v_station_id,
            v_initial_kds_status,
            v_item_notes,
            TIMEZONE('utc', NOW())
        );

        -- Insert Modifiers
        IF v_item ? 'modifiers' AND jsonb_array_length(v_item->'modifiers') > 0 THEN
            FOR v_mod IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
            LOOP
                INSERT INTO order_item_modifiers (
                    id,
                    order_item_id,
                    modifier_id,
                    modifier_name,
                    unit_price
                ) VALUES (
                    uuid_generate_v4(),
                    v_item_id,
                    (v_mod->>'modifier_id')::UUID,
                    (v_mod->>'modifier_name')::TEXT,
                    (v_mod->>'unit_price')::NUMERIC
                );
            END LOOP;
        END IF;
    END LOOP;

    -- I. Automatic Station Routing: Split into Station Tickets
    FOR v_station_record IN
        SELECT DISTINCT oi.station_id, ks.code AS station_code, ks.name AS station_name
        FROM order_items oi
        JOIN kitchen_stations ks ON oi.station_id = ks.id
        WHERE oi.order_id = v_order_id
    LOOP
        v_ticket_id := uuid_generate_v4();
        v_ticket_number := 'TKT-' || v_station_record.station_code || '-' || RIGHT(v_order_number, 4);

        INSERT INTO station_routing_tickets (
            id,
            ticket_number,
            order_id,
            branch_id,
            station_id,
            status,
            created_at
        ) VALUES (
            v_ticket_id,
            v_ticket_number,
            v_order_id,
            p_branch_id,
            v_station_record.station_id,
            v_initial_kds_status,
            TIMEZONE('utc', NOW())
        );

        -- Link items to this station ticket
        INSERT INTO station_ticket_items (ticket_id, order_item_id)
        SELECT v_ticket_id, oi.id
        FROM order_items oi
        WHERE oi.order_id = v_order_id AND oi.station_id = v_station_record.station_id;
    END LOOP;

    -- J. Table Occupancy Update
    IF p_order_type = 'dine_in' AND p_table_id IS NOT NULL THEN
        UPDATE dining_tables
        SET status = 'occupied',
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = p_table_id;
    END IF;

    -- K. Audit Log Entry
    IF p_cashier_id IS NOT NULL THEN
        INSERT INTO audit_logs (
            id,
            branch_id,
            user_id,
            action_type,
            entity_name,
            entity_id,
            new_data,
            reason,
            created_at
        ) VALUES (
            uuid_generate_v4(),
            p_branch_id,
            p_cashier_id,
            'order_submit',
            'orders',
            v_order_id,
            jsonb_build_object(
                'order_number', v_order_number,
                'source', p_order_source,
                'total_amount', v_total_amount,
                'requires_approval', p_requires_staff_approval
            ),
            'Order submitted via ' || p_order_source,
            TIMEZONE('utc', NOW())
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount,
        'subtotal', v_subtotal,
        'service_charge', v_service_charge,
        'delivery_fee', COALESCE(p_delivery_fee, 0.00),
        'requires_approval', p_requires_staff_approval,
        'is_duplicate', false,
        'message', 'Order placed successfully'
    );
END;
$$;

-- 6. APPROVE SELF-ORDER RPC (Staff Confirmation)
CREATE OR REPLACE FUNCTION approve_self_order(
    p_order_id UUID,
    p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE orders
    SET requires_staff_approval = false,
        approved_by = p_staff_id,
        approved_at = TIMEZONE('utc', NOW()),
        kds_status = 'submitted',
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_order_id;

    UPDATE order_items
    SET kds_status = 'submitted'
    WHERE order_id = p_order_id;

    UPDATE station_routing_tickets
    SET status = 'submitted'
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Order approved and sent to KDS');
END;
$$;

-- 7. ENABLE REALTIME ON NEW TABLES & EXPAND PUBLICATION
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE delivery_riders;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE inter_branch_stock_transfers;
EXCEPTION WHEN others THEN null;
END $$;

-- 8. GRANT ACCESS POLICIES
GRANT ALL ON delivery_riders TO authenticated, anon, service_role;
GRANT ALL ON inter_branch_stock_transfers TO authenticated, anon, service_role;
GRANT ALL ON inter_branch_transfer_items TO authenticated, anon, service_role;

ALTER TABLE delivery_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_branch_stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_branch_transfer_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY allow_all_riders ON delivery_riders FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY allow_all_transfers ON inter_branch_stock_transfers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY allow_all_transfer_items ON inter_branch_transfer_items FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 9. IDEMPOTENT SEED DATA FOR PHASE 4
-- A. Second Branch: Kandy Branch - Peradeniya Rd
INSERT INTO branches (
    id,
    code,
    name,
    address,
    phone,
    currency,
    timezone,
    tax_rate,
    service_charge_rate,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'KANDY-01',
    'Kandy Branch - Peradeniya Rd',
    'No. 128 Peradeniya Road, Kandy, Sri Lanka',
    '+94 81 223 4567',
    'LKR',
    'Asia/Colombo',
    0.00,
    10.00,
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone;

-- Ensure Kandy branch menu version exists
INSERT INTO menu_versions (branch_id, version_number)
VALUES ('00000000-0000-0000-0000-000000000002', 1)
ON CONFLICT (branch_id) DO NOTHING;

-- B. Kitchen Stations for Kandy Branch
INSERT INTO kitchen_stations (id, branch_id, code, name, is_active)
VALUES 
    ('cccccccc-1111-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000002', 'HOT', 'Hot Kitchen', true),
    ('cccccccc-2222-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000002', 'BEV', 'Beverage Station', true)
ON CONFLICT (branch_id, code) DO NOTHING;

-- C. Restaurant Floor & Dining Tables for Kandy Branch
INSERT INTO restaurant_floors (id, branch_id, name, display_order)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'Kandy Dining Hall', 1)
ON CONFLICT DO NOTHING;

INSERT INTO dining_tables (id, branch_id, floor_id, table_number, seating_capacity, status, pos_x, pos_y, is_active)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', 'K1', 4, 'available', 40, 40, true),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', 'K2', 2, 'available', 160, 40, true),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', 'K3', 6, 'available', 280, 40, true),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', 'K4', 4, 'available', 400, 40, true)
ON CONFLICT (branch_id, table_number) DO UPDATE SET
    seating_capacity = EXCLUDED.seating_capacity,
    status = EXCLUDED.status,
    pos_x = EXCLUDED.pos_x,
    pos_y = EXCLUDED.pos_y,
    is_active = EXCLUDED.is_active;

-- D. Ingredients for Kandy Branch (for transfer testing)
INSERT INTO ingredients (id, branch_id, name, sku, unit, current_stock, min_stock_level, unit_cost, category)
VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Basmati Rice', 'ING-BR-01', 'kg', 15.000, 10.000, 450.00, 'Dry Goods'),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Chicken Breast', 'ING-CB-01', 'kg', 8.500, 5.000, 1400.00, 'Meat & Poultry'),
    ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Cooking Oil', 'ING-OIL-01', 'l', 12.000, 8.000, 850.00, 'Oils & Sauces')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    unit = EXCLUDED.unit,
    current_stock = EXCLUDED.current_stock,
    unit_cost = EXCLUDED.unit_cost;

-- E. Delivery Riders
INSERT INTO delivery_riders (id, branch_id, name, phone, vehicle_type, vehicle_plate, status, is_active)
VALUES
    (
        '11111111-dddd-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001',
        'Kamal Perera',
        '0771234567',
        'bike',
        'WP BDF-1234',
        'available',
        true
    ),
    (
        '22222222-dddd-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000001',
        'Sunil Shantha',
        '0719876543',
        'bike',
        'WP BCD-5678',
        'available',
        true
    ),
    (
        '33333333-dddd-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000002',
        'Nuwan Pradeep',
        '0784567890',
        'bike',
        'CP AB-4321',
        'available',
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    vehicle_plate = EXCLUDED.vehicle_plate,
    status = EXCLUDED.status;
