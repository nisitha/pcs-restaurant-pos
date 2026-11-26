-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - ORDER ROUTING & REALTIME
-- Migration: 004_order_routing_and_realtime.sql
-- Description: Enables Supabase Realtime for orders & kitchen tickets,
--              adds idempotency tracking, and creates the atomic submit_pos_order RPC.
-- ============================================================================

-- 1. Ensure columns exist on tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW());

DO $$ BEGIN
    ALTER TABLE orders ADD CONSTRAINT uq_orders_idempotency_key UNIQUE (idempotency_key);
EXCEPTION WHEN duplicate_object THEN null;
WHEN duplicate_table THEN null;
END $$;

-- 2. Enable Supabase Realtime Publication for Live KDS & Orders
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE station_routing_tickets;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dining_tables;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_object THEN null;
END $$;

-- 3. Daily Order Number Generator (ORD-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_daily_order_number(p_branch_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_date_str TEXT;
    v_count INT;
    v_order_num TEXT;
BEGIN
    v_date_str := TO_CHAR(TIMEZONE('Asia/Colombo', NOW()), 'YYYYMMDD');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM orders
    WHERE branch_id = p_branch_id
      AND TO_CHAR(TIMEZONE('Asia/Colombo', created_at), 'YYYYMMDD') = v_date_str;
    
    v_order_num := 'ORD-' || v_date_str || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN v_order_num;
END;
$$ LANGUAGE plpgsql;

-- 4. Atomic Multi-Station POS Order Submission RPC
CREATE OR REPLACE FUNCTION submit_pos_order(
    p_branch_id UUID,
    p_cashier_id UUID,
    p_shift_id UUID,
    p_order_type order_type,
    p_table_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 0.00,
    p_discount_amount NUMERIC DEFAULT 0.00,
    p_discount_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB
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
    v_routed_stations TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- A. Idempotency Check (prevent duplicate orders on double-tap)
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

    -- Calculate Service Charge (applied only to Dine-in by default)
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

    -- F. Insert Parent Order
    INSERT INTO orders (
        id,
        branch_id,
        order_number,
        order_type,
        table_id,
        customer_id,
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
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        p_branch_id,
        v_order_number,
        p_order_type,
        p_table_id,
        v_customer_id,
        p_cashier_id,
        p_shift_id,
        'submitted',
        'unpaid',
        v_subtotal,
        COALESCE(p_discount_amount, 0.00),
        v_service_charge,
        COALESCE(p_delivery_fee, 0.00),
        v_total_amount,
        0.00,
        p_notes,
        TRIM(p_idempotency_key),
        TIMEZONE('utc', NOW()),
        TIMEZONE('utc', NOW())
    );

    -- G. Insert Order Items & Modifiers
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

        -- Fallback default station if missing
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
            'submitted',
            v_item_notes,
            TIMEZONE('utc', NOW())
        );

        -- Insert Modifiers for this item
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

    -- H. Automatic Station Routing: Split into KOT / Station Tickets
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
            'submitted',
            TIMEZONE('utc', NOW())
        );

        -- Link items to this station ticket
        INSERT INTO station_ticket_items (ticket_id, order_item_id)
        SELECT v_ticket_id, oi.id
        FROM order_items oi
        WHERE oi.order_id = v_order_id AND oi.station_id = v_station_record.station_id;

        v_routed_stations := array_append(v_routed_stations, v_station_record.station_name);
    END LOOP;

    -- I. Update Table Status to Occupied (for Dine-in)
    IF p_order_type = 'dine_in' AND p_table_id IS NOT NULL THEN
        UPDATE dining_tables
        SET status = 'occupied',
            current_order_id = v_order_id,
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = p_table_id;
    END IF;

    -- J. Immutable Audit Log Entry
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
            'order_type', p_order_type,
            'total_amount', v_total_amount,
            'table_id', p_table_id,
            'stations_routed', v_routed_stations
        ),
        'POS order submitted and routed to kitchen stations',
        TIMEZONE('utc', NOW())
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', p_order_type,
        'total_amount', v_total_amount,
        'subtotal', v_subtotal,
        'service_charge', v_service_charge,
        'stations_routed', v_routed_stations,
        'created_at', TIMEZONE('utc', NOW())
    );
END;
$$;

-- Grant execution to API roles
GRANT EXECUTE ON FUNCTION submit_pos_order(UUID, UUID, UUID, order_type, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_daily_order_number(UUID) TO anon, authenticated, service_role;

-- Grant table access to API roles
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_item_modifiers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON station_routing_tickets TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON station_ticket_items TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON dining_tables TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON audit_logs TO anon, authenticated, service_role;
