-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - PHASE 2: INVENTORY & RECIPES
-- Migration: 006_inventory_and_recipes.sql
-- Description: Inventory management, Recipe (BOM) stock deduction engine,
--              Suppliers, Purchasing, GRN, Wastage, and Manager PIN Void/Refunds.
-- ============================================================================

-- 1. INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50),
    unit VARCHAR(20) NOT NULL, -- 'g', 'kg', 'ml', 'l', 'pcs'
    current_stock NUMERIC(12, 3) DEFAULT 0.000 NOT NULL,
    min_stock_level NUMERIC(12, 3) DEFAULT 5.000 NOT NULL,
    unit_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL, -- LKR cost per base unit
    category VARCHAR(50) DEFAULT 'general' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. RECIPES TABLE (Bill of Materials parent)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES item_variants(id) ON DELETE CASCADE,
    yield_quantity NUMERIC(8, 2) DEFAULT 1.00 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_recipes_item_variant UNIQUE (menu_item_id, variant_id)
);

-- 3. RECIPE ITEMS TABLE (BOM ingredients & exact quantities)
CREATE TABLE IF NOT EXISTS recipe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
    quantity NUMERIC(10, 4) NOT NULL, -- e.g. 0.250 for 250g, 1.0 for 1 egg
    unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_recipe_ingredient UNIQUE (recipe_id, ingredient_id)
);

-- 4. SUPPLIERS TABLE (Ensure columns exist)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. PURCHASE ORDERS & ITEMS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
    po_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL, -- 'draft', 'ordered', 'received', 'cancelled'
    total_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- 6. GOODS RECEIVED NOTES (GRN) & ITEMS
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
    grn_number VARCHAR(50) NOT NULL,
    invoice_number VARCHAR(50),
    total_received_amount NUMERIC(12, 2) NOT NULL,
    received_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID REFERENCES goods_received_notes(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    quantity_received NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- 7. WASTAGE & SPOILAGE LOGS
CREATE TABLE IF NOT EXISTS wastage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL, -- e.g. 'Spoiled', 'Expired', 'Burnt during cooking', 'Spillage'
    logged_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. IMMUTABLE STOCK MOVEMENTS LEDGER
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'sale_deduction', 'sale_reversal', 'purchase_grn', 'wastage_spoilage', 'manual_adjustment', 'physical_count'
    quantity NUMERIC(12, 3) NOT NULL, -- Negative for depletions, positive for additions
    unit_cost NUMERIC(10, 2) NOT NULL,
    reference_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    reference_grn_id UUID REFERENCES goods_received_notes(id) ON DELETE SET NULL,
    reference_wastage_id UUID REFERENCES wastage_logs(id) ON DELETE SET NULL,
    idempotent_key VARCHAR(150) UNIQUE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. PERMISSIONS & INDEXES
GRANT ALL ON ingredients TO anon, authenticated, service_role;
GRANT ALL ON recipes TO anon, authenticated, service_role;
GRANT ALL ON recipe_items TO anon, authenticated, service_role;
GRANT ALL ON suppliers TO anon, authenticated, service_role;
GRANT ALL ON purchase_orders TO anon, authenticated, service_role;
GRANT ALL ON po_items TO anon, authenticated, service_role;
GRANT ALL ON goods_received_notes TO anon, authenticated, service_role;
GRANT ALL ON grn_items TO anon, authenticated, service_role;
GRANT ALL ON wastage_logs TO anon, authenticated, service_role;
GRANT ALL ON stock_movements TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ingredients_branch ON ingredients(branch_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_stock ON ingredients(current_stock, min_stock_level);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ing ON stock_movements(ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON stock_movements(reference_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_key ON stock_movements(idempotent_key);

-- 10. ATOMIC IDEMPOTENT RECIPE STOCK DEDUCTION FUNCTION
CREATE OR REPLACE FUNCTION deduct_order_recipe_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_recipe RECORD;
    v_r_item RECORD;
    v_deduct_qty NUMERIC(12, 3);
    v_idempotent_key VARCHAR(150);
    v_deductions_count INTEGER := 0;
    v_already_done BOOLEAN;
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    -- A. Fetch order
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- B. Strict Idempotency Check: check if sale deductions already logged for this order
    SELECT EXISTS (
        SELECT 1 FROM stock_movements
        WHERE reference_order_id = p_order_id
          AND movement_type = 'sale_deduction'
    ) INTO v_already_done;

    IF v_already_done THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Stock already deducted for order (idempotent skip)',
            'order_id', p_order_id,
            'deductions_count', 0
        );
    END IF;

    -- C. Loop through each order item
    FOR v_item IN
        SELECT oi.*, m.name AS item_name
        FROM order_items oi
        JOIN menu_items m ON m.id = oi.menu_item_id
        WHERE oi.order_id = p_order_id
    LOOP
        -- Look for variant-specific recipe first, then fallback to base menu item recipe
        SELECT * INTO v_recipe
        FROM recipes
        WHERE menu_item_id = v_item.menu_item_id
          AND (
              (v_item.variant_id IS NOT NULL AND variant_id = v_item.variant_id)
              OR (variant_id IS NULL)
          )
        ORDER BY variant_id NULLS LAST
        LIMIT 1;

        IF v_recipe.id IS NOT NULL THEN
            -- Deduct each ingredient configured in the BOM
            FOR v_r_item IN
                SELECT ri.*, ing.name AS ingredient_name, ing.unit_cost, ing.branch_id AS ing_branch
                FROM recipe_items ri
                JOIN ingredients ing ON ing.id = ri.ingredient_id
                WHERE ri.recipe_id = v_recipe.id
            LOOP
                v_deduct_qty := ROUND((v_r_item.quantity * v_item.quantity)::NUMERIC, 3);
                v_idempotent_key := 'SALE-' || p_order_id::text || '-' || v_item.id::text || '-' || v_r_item.ingredient_id::text;

                -- Deduct from ingredient stock
                UPDATE ingredients
                SET current_stock = current_stock - v_deduct_qty,
                    updated_at = v_now
                WHERE id = v_r_item.ingredient_id;

                -- Record immutable movement ledger entry
                INSERT INTO stock_movements (
                    id,
                    branch_id,
                    ingredient_id,
                    movement_type,
                    quantity,
                    unit_cost,
                    reference_order_id,
                    idempotent_key,
                    notes,
                    created_by,
                    created_at
                ) VALUES (
                    uuid_generate_v4(),
                    v_order.branch_id,
                    v_r_item.ingredient_id,
                    'sale_deduction',
                    -v_deduct_qty,
                    v_r_item.unit_cost,
                    p_order_id,
                    v_idempotent_key,
                    'POS Sale Deduction: ' || v_item.quantity::text || 'x ' || v_item.item_name || ' (' || v_deduct_qty::text || ' ' || v_r_item.unit || ' ' || v_r_item.ingredient_name || ')',
                    v_order.created_by,
                    v_now
                ) ON CONFLICT (idempotent_key) DO NOTHING;

                v_deductions_count := v_deductions_count + 1;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'deductions_count', v_deductions_count,
        'deducted_at', v_now
    );
END;
$$;

-- 11. ATOMIC MANAGER PIN VOID OR REFUND FUNCTION
CREATE OR REPLACE FUNCTION process_order_void_or_refund(
    p_order_id UUID,
    p_manager_pin VARCHAR,
    p_action VARCHAR, -- 'void' or 'refund'
    p_reason TEXT,
    p_refund_amount NUMERIC DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager RECORD;
    v_order RECORD;
    v_movement RECORD;
    v_rev_key VARCHAR(150);
    v_reversals_count INTEGER := 0;
    v_refund_amt NUMERIC(12, 2);
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
    v_new_status payment_status;
BEGIN
    -- A. Validate Manager / Owner PIN
    IF p_manager_pin IS NULL OR TRIM(p_manager_pin) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Manager PIN is required');
    END IF;

    SELECT * INTO v_manager
    FROM user_profiles
    WHERE role IN ('owner', 'manager')
      AND is_active = TRUE
      AND pin_code_hash = crypt(p_manager_pin, pin_code_hash)
    LIMIT 1;

    IF v_manager.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid Manager PIN. Void/Refund requires Manager (2222) or Owner (1111) authorization.'
        );
    END IF;

    -- B. Validate Mandatory Reason
    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A mandatory reason is required for void or refund approval.'
        );
    END IF;

    -- C. Fetch & Lock Order
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    IF v_order.payment_status = 'voided' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order has already been voided');
    END IF;

    IF v_order.payment_status = 'refunded' AND p_action = 'refund' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order has already been refunded');
    END IF;

    -- D. Determine status & amount
    IF p_action = 'void' THEN
        v_new_status := 'voided';
        v_refund_amt := COALESCE(p_refund_amount, v_order.paid_amount);
    ELSE
        v_new_status := 'refunded';
        v_refund_amt := COALESCE(p_refund_amount, v_order.paid_amount);
    END IF;

    -- E. Insert Refund Ledger Record (Never delete or edit original payment records)
    IF v_refund_amt > 0 THEN
        INSERT INTO refunds (
            id,
            payment_id,
            order_id,
            branch_id,
            shift_id,
            amount,
            reason,
            authorized_by,
            created_by,
            created_at
        )
        SELECT
            uuid_generate_v4(),
            p.id,
            p_order_id,
            v_order.branch_id,
            COALESCE(p_shift_id, p.shift_id),
            v_refund_amt,
            p_reason,
            v_manager.id,
            v_manager.id,
            v_now
        FROM payments p
        WHERE p.order_id = p_order_id
        ORDER BY p.created_at DESC
        LIMIT 1;
    END IF;

    -- F. Update Order Status & cancel KDS preparation
    UPDATE orders
    SET payment_status = v_new_status,
        kds_status = 'cancelled',
        updated_at = v_now
    WHERE id = p_order_id;

    -- Cancel KDS station tickets
    UPDATE station_routing_tickets
    SET status = 'cancelled'
    WHERE order_id = p_order_id;

    -- If dining table was assigned, free table back to available
    IF v_order.table_id IS NOT NULL THEN
        UPDATE dining_tables
        SET status = 'available'
        WHERE id = v_order.table_id;
    END IF;

    -- G. Idempotently Reverse Recipe Deductions back to Inventory
    FOR v_movement IN
        SELECT *
        FROM stock_movements
        WHERE reference_order_id = p_order_id
          AND movement_type = 'sale_deduction'
    LOOP
        v_rev_key := 'REV-' || v_movement.idempotent_key;

        -- Check if reversal already recorded
        IF NOT EXISTS (SELECT 1 FROM stock_movements WHERE idempotent_key = v_rev_key) THEN
            -- Re-add ingredient stock
            UPDATE ingredients
            SET current_stock = current_stock + ABS(v_movement.quantity),
                updated_at = v_now
            WHERE id = v_movement.ingredient_id;

            -- Insert reversal movement ledger entry
            INSERT INTO stock_movements (
                id,
                branch_id,
                ingredient_id,
                movement_type,
                quantity,
                unit_cost,
                reference_order_id,
                idempotent_key,
                notes,
                created_by,
                created_at
            ) VALUES (
                uuid_generate_v4(),
                v_movement.branch_id,
                v_movement.ingredient_id,
                'sale_reversal',
                ABS(v_movement.quantity),
                v_movement.unit_cost,
                p_order_id,
                v_rev_key,
                'Stock Reversal (' || p_action || '): ' || p_reason || ' [Auth: ' || v_manager.display_name || ']',
                v_manager.id,
                v_now
            );

            v_reversals_count := v_reversals_count + 1;
        END IF;
    END LOOP;

    -- H. Record Mandatory Immutable Audit Log
    INSERT INTO audit_logs (
        id,
        branch_id,
        user_id,
        action_type,
        entity_name,
        entity_id,
        old_data,
        new_data,
        reason,
        created_at
    ) VALUES (
        uuid_generate_v4(),
        v_order.branch_id,
        v_manager.id,
        'order_' || p_action,
        'orders',
        p_order_id,
        jsonb_build_object(
            'order_number', v_order.order_number,
            'payment_status', v_order.payment_status,
            'kds_status', v_order.kds_status,
            'paid_amount', v_order.paid_amount
        ),
        jsonb_build_object(
            'order_number', v_order.order_number,
            'payment_status', v_new_status,
            'kds_status', 'cancelled',
            'refund_amount', v_refund_amt,
            'reversals_count', v_reversals_count,
            'authorized_by', v_manager.display_name
        ),
        p_reason,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'action', p_action,
        'status', v_new_status,
        'refund_amount', v_refund_amt,
        'reversals_count', v_reversals_count,
        'authorized_by', v_manager.display_name,
        'processed_at', v_now
    );
END;
$$;

-- 12. UPDATE SETTLE_ORDER_PAYMENT TO TRIGGER RECIPE STOCK DEDUCTION
CREATE OR REPLACE FUNCTION settle_order_payment(
    p_order_id UUID,
    p_cashier_id UUID,
    p_shift_id UUID DEFAULT NULL,
    p_payments JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_payment JSONB;
    v_method payment_method;
    v_amount NUMERIC;
    v_tx_ref TEXT;
    v_total_tendered NUMERIC := 0.00;
    v_total_cash NUMERIC := 0.00;
    v_new_paid_total NUMERIC := 0.00;
    v_new_payment_status payment_status;
    v_payment_ids UUID[] := ARRAY[]::UUID[];
    v_pid UUID;
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    -- A. Fetch and lock order row
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order not found.'
        );
    END IF;

    -- B. Process each payment record
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_method := (v_payment->>'method')::payment_method;
        v_amount := ROUND((v_payment->>'amount')::NUMERIC, 2);
        v_tx_ref := v_payment->>'transaction_ref';

        IF v_amount > 0 THEN
            v_pid := uuid_generate_v4();
            INSERT INTO payments (
                id,
                order_id,
                branch_id,
                shift_id,
                method,
                amount,
                currency,
                transaction_ref,
                created_by,
                created_at
            ) VALUES (
                v_pid,
                p_order_id,
                v_order.branch_id,
                p_shift_id,
                v_method,
                v_amount,
                'LKR',
                v_tx_ref,
                p_cashier_id,
                v_now
            );

            v_payment_ids := array_append(v_payment_ids, v_pid);
            v_total_tendered := v_total_tendered + v_amount;

            IF v_method = 'cash' THEN
                v_total_cash := v_total_cash + v_amount;
            END IF;
        END IF;
    END LOOP;

    -- C. Calculate new paid amount and status
    v_new_paid_total := ROUND(v_order.paid_amount + v_total_tendered, 2);

    IF v_new_paid_total >= v_order.total_amount THEN
        v_new_payment_status := 'paid';
    ELSIF v_new_paid_total > 0 THEN
        v_new_payment_status := 'partially_paid';
    ELSE
        v_new_payment_status := 'unpaid';
    END IF;

    -- D. Update parent order
    UPDATE orders
    SET paid_amount = v_new_paid_total,
        payment_status = v_new_payment_status,
        updated_at = v_now
    WHERE id = p_order_id;

    -- E. Update Cash Shift Drawer Balance if cash was received
    IF p_shift_id IS NOT NULL AND v_total_cash > 0 THEN
        UPDATE cash_shifts
        SET total_sales = ROUND(COALESCE(total_sales, 0.00) + v_total_cash, 2),
            expected_cash = ROUND(COALESCE(expected_cash, opening_float) + v_total_cash, 2)
        WHERE id = p_shift_id;
    END IF;

    -- F. AUTOMATIC RECIPE STOCK DEDUCTION (Triggered when fully paid)
    IF v_new_payment_status = 'paid' THEN
        PERFORM deduct_order_recipe_stock(p_order_id);
    END IF;

    -- G. Insert Immutable Audit Log
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
        v_order.branch_id,
        p_cashier_id,
        'order_payment',
        'orders',
        p_order_id,
        jsonb_build_object(
            'order_number', v_order.order_number,
            'total_amount', v_order.total_amount,
            'tendered', v_total_tendered,
            'cash_amount', v_total_cash,
            'payment_status', v_new_payment_status,
            'payment_ids', v_payment_ids
        ),
        'Payment settled at POS terminal',
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'total_amount', v_order.total_amount,
        'paid_amount', v_new_paid_total,
        'payment_status', v_new_payment_status,
        'payment_ids', v_payment_ids,
        'settled_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_order_recipe_stock(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_order_void_or_refund(UUID, VARCHAR, VARCHAR, TEXT, NUMERIC, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION settle_order_payment(UUID, UUID, UUID, JSONB) TO anon, authenticated, service_role;

-- ============================================================================
-- 13. IDEMPOTENT SAMPLE SEED DATA (INGREDIENTS, SUPPLIERS, RECIPES)
-- ============================================================================

-- A. Common Ingredients (in LKR unit costs)
INSERT INTO ingredients (id, branch_id, name, sku, unit, current_stock, min_stock_level, unit_cost, category)
VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Basmati Rice', 'ING-RICE', 'kg', 50.000, 10.000, 250.00, 'Dry Goods'),
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Fresh Boneless Chicken', 'ING-CHK', 'kg', 30.000, 5.000, 1100.00, 'Meat & Poultry'),
    ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Prime Beef Patty', 'ING-PATTY', 'pcs', 100.000, 20.000, 450.00, 'Meat & Poultry'),
    ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Brioche Burger Bun', 'ING-BUN', 'pcs', 120.000, 25.000, 80.00, 'Bakery'),
    ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Cheddar Cheese Slice', 'ING-CHZ', 'pcs', 150.000, 30.000, 95.00, 'Dairy'),
    ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Fresh Farm Eggs', 'ING-EGG', 'pcs', 200.000, 40.000, 38.00, 'Dairy'),
    ('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Carrots', 'ING-CARROT', 'kg', 15.000, 3.000, 180.00, 'Produce'),
    ('50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Refined Cooking Oil', 'ING-OIL', 'l', 25.000, 5.000, 750.00, 'Oils & Fats'),
    ('50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Sri Lankan Roast Coffee Beans', 'ING-COFFEE', 'kg', 10.000, 2.000, 3500.00, 'Beverages'),
    ('50000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Fresh Cow Milk', 'ING-MILK', 'l', 30.000, 6.000, 420.00, 'Dairy'),
    ('50000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Belgian Dark Chocolate', 'ING-CHOC', 'kg', 8.000, 2.000, 2800.00, 'Baking')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    unit = EXCLUDED.unit,
    current_stock = EXCLUDED.current_stock,
    min_stock_level = EXCLUDED.min_stock_level,
    unit_cost = EXCLUDED.unit_cost,
    category = EXCLUDED.category;

-- B. Sample Suppliers
INSERT INTO suppliers (id, branch_id, name, contact_person, phone, email, address, is_active)
VALUES
    ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Lanka Meat & Poultry Distributors', 'Sunil Perera', '+94 11 234 1111', 'orders@lankameat.lk', 'Kaduwela Road, Malabe', true),
    ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Colombo Fresh Veg & Produce', 'Kamal Silva', '+94 11 234 2222', 'sales@colomboproduce.lk', 'Manning Market, Peliyagoda', true),
    ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Ceylon Dairy & Bakery Goods', 'Nadeeka Fernando', '+94 11 234 3333', 'info@ceylondairy.lk', 'High Level Road, Nugegoda', true),
    ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Hill Country Roasters & Coffee', 'Arjuna De Silva', '+94 11 234 4444', 'supply@hillcountrycoffee.lk', 'Kandy Road, Kiribathgoda', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- C. Sample Recipes (BOM Parent records)
-- 1. Chicken Fried Rice (Regular)
INSERT INTO recipes (id, menu_item_id, variant_id, yield_quantity, notes)
VALUES ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1.00, 'Standard 1-person portion')
ON CONFLICT (menu_item_id, variant_id) DO UPDATE SET notes = EXCLUDED.notes;

-- 2. Chicken Fried Rice (Large)
INSERT INTO recipes (id, menu_item_id, variant_id, yield_quantity, notes)
VALUES ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 1.00, 'Large 2-person sharing portion')
ON CONFLICT (menu_item_id, variant_id) DO UPDATE SET notes = EXCLUDED.notes;

-- 3. Beef Burger Deluxe
INSERT INTO recipes (id, menu_item_id, variant_id, yield_quantity, notes)
VALUES ('70000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', NULL, 1.00, 'Gourmet burger with cheese')
ON CONFLICT (menu_item_id, variant_id) DO UPDATE SET notes = EXCLUDED.notes;

-- 4. Iced Coffee with Vanilla Ice Cream (Regular)
INSERT INTO recipes (id, menu_item_id, variant_id, yield_quantity, notes)
VALUES ('70000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 1.00, 'Regular 350ml cup')
ON CONFLICT (menu_item_id, variant_id) DO UPDATE SET notes = EXCLUDED.notes;

-- 5. Chocolate Lava Cake
INSERT INTO recipes (id, menu_item_id, variant_id, yield_quantity, notes)
VALUES ('70000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', NULL, 1.00, 'Baked dessert ramekin')
ON CONFLICT (menu_item_id, variant_id) DO UPDATE SET notes = EXCLUDED.notes;

-- D. Sample Recipe BOM Items (Exact ingredient quantities)
-- Recipe 1: Chicken Fried Rice (Regular)
INSERT INTO recipe_items (id, recipe_id, ingredient_id, quantity, unit)
VALUES
    ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 0.250, 'kg'), -- 250g Rice
    ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 0.150, 'kg'), -- 150g Chicken
    ('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 1.000, 'pcs'), -- 1 Egg
    ('80000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000007', 0.050, 'kg'), -- 50g Carrot
    ('80000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 0.030, 'l')   -- 30ml Oil
ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Recipe 2: Chicken Fried Rice (Large - scaled 1.6x)
INSERT INTO recipe_items (id, recipe_id, ingredient_id, quantity, unit)
VALUES
    ('80000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 0.400, 'kg'), -- 400g Rice
    ('80000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 0.250, 'kg'), -- 250g Chicken
    ('80000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000006', 2.000, 'pcs'), -- 2 Eggs
    ('80000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000007', 0.080, 'kg'), -- 80g Carrot
    ('80000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000008', 0.050, 'l')   -- 50ml Oil
ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Recipe 3: Beef Burger Deluxe
INSERT INTO recipe_items (id, recipe_id, ingredient_id, quantity, unit)
VALUES
    ('80000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 1.000, 'pcs'), -- 1 Beef Patty
    ('80000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 1.000, 'pcs'), -- 1 Burger Bun
    ('80000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005', 1.000, 'pcs'), -- 1 Cheese Slice
    ('80000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000008', 0.020, 'l')   -- 20ml Oil
ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Recipe 4: Iced Coffee (Regular)
INSERT INTO recipe_items (id, recipe_id, ingredient_id, quantity, unit)
VALUES
    ('80000000-0000-0000-0000-000000000015', '70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000009', 0.020, 'kg'), -- 20g Coffee Beans
    ('80000000-0000-0000-0000-000000000016', '70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000010', 0.200, 'l')   -- 200ml Fresh Milk
ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Recipe 5: Chocolate Lava Cake
INSERT INTO recipe_items (id, recipe_id, ingredient_id, quantity, unit)
VALUES
    ('80000000-0000-0000-0000-000000000017', '70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000011', 0.080, 'kg'), -- 80g Chocolate
    ('80000000-0000-0000-0000-000000000018', '70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000006', 1.000, 'pcs'), -- 1 Egg
    ('80000000-0000-0000-0000-000000000019', '70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000010', 0.050, 'l')   -- 50ml Milk
ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity = EXCLUDED.quantity;
