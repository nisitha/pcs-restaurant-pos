-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - PHASE 3: CUSTOMERS, LOYALTY & PROMOTIONS
-- Migration: 007_customers_loyalty_promotions.sql
-- Description: Customer CRM, Loyalty point ledger, Promotions & Happy-Hour rules,
--              Combo item bundling, and automated settlement hooks.
-- ============================================================================

-- 1. ENHANCE CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100),
    delivery_address TEXT,
    tier VARCHAR(30) DEFAULT 'Regular' NOT NULL, -- 'Regular', 'VIP', 'Corporate'
    loyalty_points INT DEFAULT 0 NOT NULL,
    total_spent NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Ensure columns exist if table was partially created in 001
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier VARCHAR(30) DEFAULT 'Regular' NOT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL;

-- 2. IMMUTABLE LOYALTY TRANSACTIONS LEDGER
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points_change INT NOT NULL, -- positive for earned, negative for redeemed
    transaction_type VARCHAR(30) NOT NULL, -- 'earned', 'redeemed', 'adjusted', 'bonus', 'reversal'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. PROMOTIONS & HAPPY-HOUR RULES TABLE
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    promo_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'happy_hour', 'combo_deal'
    discount_value NUMERIC(10, 2) NOT NULL, -- e.g. 15 for 15% or 300 for Rs. 300
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    applies_to_category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    schedule_start_time TIME,
    schedule_end_time TIME,
    days_of_week INT[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6], -- 0=Sunday, 1=Monday ... 6=Saturday
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. COMBO ITEMS TABLE (Bundling menu items under a combo promotion)
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    quantity INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. ENHANCE ORDERS TABLE WITH LOYALTY & PROMO COLUMNS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INT DEFAULT 0 NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_earned INT DEFAULT 0 NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;

-- 6. PERMISSIONS & INDEXES
GRANT ALL ON customers TO anon, authenticated, service_role;
GRANT ALL ON loyalty_transactions TO anon, authenticated, service_role;
GRANT ALL ON promotions TO anon, authenticated, service_role;
GRANT ALL ON combo_items TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_order ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(branch_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- 7. ATOMIC LOYALTY PROCESSOR FUNCTION
CREATE OR REPLACE FUNCTION process_order_loyalty(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_customer RECORD;
    v_points_earned INT := 0;
    v_points_redeemed INT := 0;
    v_already_earned BOOLEAN := FALSE;
    v_already_redeemed BOOLEAN := FALSE;
    v_new_tier VARCHAR(30);
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    -- A. Fetch order
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF v_order.id IS NULL OR v_order.customer_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'No customer attached to order');
    END IF;

    SELECT * INTO v_customer FROM customers WHERE id = v_order.customer_id FOR UPDATE;
    IF v_customer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Customer not found');
    END IF;

    -- B. Process Points Redemption (if specified on order and not already recorded)
    v_points_redeemed := COALESCE(v_order.loyalty_points_redeemed, 0);
    IF v_points_redeemed > 0 THEN
        SELECT EXISTS (
            SELECT 1 FROM loyalty_transactions
            WHERE order_id = p_order_id AND transaction_type = 'redeemed'
        ) INTO v_already_redeemed;

        IF NOT v_already_redeemed THEN
            -- Deduct points from customer
            UPDATE customers
            SET loyalty_points = GREATEST(0, loyalty_points - v_points_redeemed),
                updated_at = v_now
            WHERE id = v_customer.id;

            -- Log transaction
            INSERT INTO loyalty_transactions (
                id, customer_id, order_id, points_change, transaction_type, notes, created_at
            ) VALUES (
                uuid_generate_v4(), v_customer.id, p_order_id, -v_points_redeemed, 'redeemed',
                'Redeemed discount on order ' || v_order.order_number, v_now
            );
        END IF;
    END IF;

    -- C. Process Points Earning (1 point per Rs. 100 spent)
    SELECT EXISTS (
        SELECT 1 FROM loyalty_transactions
        WHERE order_id = p_order_id AND transaction_type = 'earned'
    ) INTO v_already_earned;

    IF NOT v_already_earned AND v_order.paid_amount >= 100 THEN
        v_points_earned := FLOOR(v_order.paid_amount / 100)::INT;

        -- Update customer points and total spent
        UPDATE customers
        SET loyalty_points = loyalty_points + v_points_earned,
            total_spent = total_spent + v_order.paid_amount,
            updated_at = v_now
        WHERE id = v_customer.id;

        -- Update order record with points earned
        UPDATE orders
        SET loyalty_points_earned = v_points_earned
        WHERE id = p_order_id;

        -- Log transaction
        INSERT INTO loyalty_transactions (
            id, customer_id, order_id, points_change, transaction_type, notes, created_at
        ) VALUES (
            uuid_generate_v4(), v_customer.id, p_order_id, v_points_earned, 'earned',
            'Earned on order ' || v_order.order_number || ' (Rs. ' || v_order.paid_amount::text || ')', v_now
        );

        -- Evaluate tier upgrade
        IF (v_customer.total_spent + v_order.paid_amount) >= 50000 THEN
            v_new_tier := 'VIP';
            UPDATE customers SET tier = v_new_tier WHERE id = v_customer.id AND tier != 'Corporate';
        ELSIF (v_customer.total_spent + v_order.paid_amount) >= 20000 THEN
            v_new_tier := 'VIP';
            UPDATE customers SET tier = v_new_tier WHERE id = v_customer.id AND tier = 'Regular';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer.id,
        'points_earned', v_points_earned,
        'points_redeemed', v_points_redeemed
    );
END;
$$;

-- 8. UPDATE SETTLE_ORDER_PAYMENT WITH AUTOMATIC LOYALTY HOOK
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

    -- F. AUTOMATIC RECIPE STOCK DEDUCTION & LOYALTY POINTS (Triggered when fully paid)
    IF v_new_payment_status = 'paid' THEN
        PERFORM deduct_order_recipe_stock(p_order_id);
        IF v_order.customer_id IS NOT NULL THEN
            PERFORM process_order_loyalty(p_order_id);
        END IF;
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

-- 9. UPDATE PROCESS_ORDER_VOID_OR_REFUND WITH LOYALTY REVERSAL
CREATE OR REPLACE FUNCTION process_order_void_or_refund(
    p_order_id UUID,
    p_manager_pin VARCHAR,
    p_action VARCHAR,
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

    -- E. Insert Refund Ledger Record
    IF v_refund_amt > 0 THEN
        INSERT INTO refunds (
            id, payment_id, order_id, branch_id, shift_id, amount, reason, authorized_by, created_by, created_at
        )
        SELECT
            uuid_generate_v4(), p.id, p_order_id, v_order.branch_id, COALESCE(p_shift_id, p.shift_id),
            v_refund_amt, p_reason, v_manager.id, v_manager.id, v_now
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

        IF NOT EXISTS (SELECT 1 FROM stock_movements WHERE idempotent_key = v_rev_key) THEN
            UPDATE ingredients
            SET current_stock = current_stock + ABS(v_movement.quantity),
                updated_at = v_now
            WHERE id = v_movement.ingredient_id;

            INSERT INTO stock_movements (
                id, branch_id, ingredient_id, movement_type, quantity, unit_cost, reference_order_id, idempotent_key, notes, created_by, created_at
            ) VALUES (
                uuid_generate_v4(), v_movement.branch_id, v_movement.ingredient_id, 'sale_reversal',
                ABS(v_movement.quantity), v_movement.unit_cost, p_order_id, v_rev_key,
                'Stock Reversal (' || p_action || '): ' || p_reason || ' [Auth: ' || v_manager.display_name || ']',
                v_manager.id, v_now
            );

            v_reversals_count := v_reversals_count + 1;
        END IF;
    END LOOP;

    -- H. Reversal of Loyalty Points (if customer attached)
    IF v_order.customer_id IS NOT NULL THEN
        -- Reverse earned points
        IF COALESCE(v_order.loyalty_points_earned, 0) > 0 THEN
            UPDATE customers
            SET loyalty_points = GREATEST(0, loyalty_points - v_order.loyalty_points_earned),
                total_spent = GREATEST(0.00, total_spent - v_refund_amt),
                updated_at = v_now
            WHERE id = v_order.customer_id;

            INSERT INTO loyalty_transactions (
                id, customer_id, order_id, points_change, transaction_type, notes, created_at
            ) VALUES (
                uuid_generate_v4(), v_order.customer_id, p_order_id, -v_order.loyalty_points_earned, 'reversal',
                'Reversal of earned points due to order ' || p_action, v_now
            );
        END IF;

        -- Restore redeemed points
        IF COALESCE(v_order.loyalty_points_redeemed, 0) > 0 THEN
            UPDATE customers
            SET loyalty_points = loyalty_points + v_order.loyalty_points_redeemed,
                updated_at = v_now
            WHERE id = v_order.customer_id;

            INSERT INTO loyalty_transactions (
                id, customer_id, order_id, points_change, transaction_type, notes, created_at
            ) VALUES (
                uuid_generate_v4(), v_order.customer_id, p_order_id, v_order.loyalty_points_redeemed, 'reversal',
                'Restoration of redeemed points due to order ' || p_action, v_now
            );
        END IF;
    END IF;

    -- I. Record Mandatory Immutable Audit Log
    INSERT INTO audit_logs (
        id, branch_id, user_id, action_type, entity_name, entity_id, old_data, new_data, reason, created_at
    ) VALUES (
        uuid_generate_v4(), v_order.branch_id, v_manager.id, 'order_' || p_action, 'orders', p_order_id,
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
        p_reason, v_now
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

GRANT EXECUTE ON FUNCTION process_order_loyalty(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION settle_order_payment(UUID, UUID, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_order_void_or_refund(UUID, VARCHAR, VARCHAR, TEXT, NUMERIC, UUID) TO anon, authenticated, service_role;

-- ============================================================================
-- 10. IDEMPOTENT SAMPLE SEED DATA (CUSTOMERS & PROMOTIONS)
-- ============================================================================

-- A. Sample Customers
INSERT INTO customers (id, branch_id, name, phone, email, tier, loyalty_points, total_spent, notes)
VALUES
    (
        '90000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Kasun Wickramasinghe',
        '+94771234567',
        'kasun.w@gmail.com',
        'VIP',
        250,
        28500.00,
        'Prefers window table. Mild spice only. Allergic to peanuts.'
    ),
    (
        '90000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Dilani Jayawardena',
        '+94719876543',
        'dilani.j@outlook.com',
        'Regular',
        80,
        8200.00,
        'Regular lunch guest. Likes extra ice in iced beverages.'
    ),
    (
        '90000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'Dialog Axiata Corporate Dining',
        '+94117890123',
        'events@dialog.lk',
        'Corporate',
        500,
        65000.00,
        'Corporate dining account. Send monthly consolidated receipts.'
    )
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    tier = EXCLUDED.tier,
    loyalty_points = EXCLUDED.loyalty_points,
    total_spent = EXCLUDED.total_spent,
    notes = EXCLUDED.notes;

-- B. Sample Promotions & Happy Hour Rules
INSERT INTO promotions (id, branch_id, name, code, promo_type, discount_value, min_order_amount, applies_to_category_id, schedule_start_time, schedule_end_time, days_of_week, is_active)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Happy Hour Beverages 15% Off',
        'HAPPY15',
        'happy_hour',
        15.00, -- 15% discount
        0.00,
        '20000000-0000-0000-0000-000000000003', -- Beverages & Coffee Category
        '16:00:00',
        '19:00:00',
        ARRAY[1, 2, 3, 4, 5], -- Monday to Friday
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Burger & Iced Coffee Combo Deal',
        'COMBO-BRG',
        'combo_deal',
        300.00, -- Rs. 300 discount off combo
        2000.00,
        NULL,
        NULL,
        NULL,
        ARRAY[0, 1, 2, 3, 4, 5, 6],
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    promo_type = EXCLUDED.promo_type,
    discount_value = EXCLUDED.discount_value,
    min_order_amount = EXCLUDED.min_order_amount,
    applies_to_category_id = EXCLUDED.applies_to_category_id,
    schedule_start_time = EXCLUDED.schedule_start_time,
    schedule_end_time = EXCLUDED.schedule_end_time,
    days_of_week = EXCLUDED.days_of_week,
    is_active = EXCLUDED.is_active;

-- C. Combo Deal Items (Burger + Iced Coffee)
INSERT INTO combo_items (id, promotion_id, menu_item_id, quantity)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 1), -- Beef Burger Deluxe
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 1)  -- Iced Coffee
ON CONFLICT (id) DO UPDATE SET
    quantity = EXCLUDED.quantity;
