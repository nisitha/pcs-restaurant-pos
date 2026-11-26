-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - PAYMENTS, SETTLEMENT & REFUNDS
-- Migration: 005_payments_and_refunds.sql
-- Description: Atomic payment settlement RPC (supports single & split tender),
--              cash shift reconciliation, and manager-authorized refunds.
-- ============================================================================

-- 1. Ensure table permissions for payment entities
GRANT SELECT, INSERT, UPDATE ON payments TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON refunds TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON cash_shifts TO anon, authenticated, service_role;

-- 2. Atomic Order Payment Settlement Procedure
CREATE OR REPLACE FUNCTION settle_order_payment(
    p_order_id UUID,
    p_cashier_id UUID,
    p_shift_id UUID DEFAULT NULL,
    p_payments JSONB DEFAULT '[]'::JSONB -- Array of { method: 'cash'|'credit_card'|'qr_payment', amount: number, transaction_ref?: text }
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

    -- F. Insert Immutable Audit Log
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

-- Grant execution to API roles
GRANT EXECUTE ON FUNCTION settle_order_payment(UUID, UUID, UUID, JSONB) TO anon, authenticated, service_role;
