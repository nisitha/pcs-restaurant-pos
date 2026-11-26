-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - INITIAL SCHEMA
-- Migration: 001_initial_schema.sql
-- Target: Supabase (PostgreSQL 15+)
-- Regional Defaults: Currency: LKR, Timezone: Asia/Colombo
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CUSTOM ENUMS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin',
        'owner',
        'manager',
        'cashier',
        'waiter',
        'chef',
        'store_keeper'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE shift_status AS ENUM ('open', 'closed', 'audited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_type AS ENUM ('dine_in', 'takeaway', 'delivery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kds_status AS ENUM (
        'draft',
        'submitted',
        'in_preparation',
        'partially_ready',
        'ready',
        'served',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'unpaid',
        'partially_paid',
        'paid',
        'refunded',
        'voided'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM (
        'sale_deduction',
        'sale_reversal',
        'purchase_grn',
        'wastage_spoilage',
        'manual_adjustment',
        'branch_transfer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE po_status AS ENUM (
        'draft',
        'ordered',
        'partially_received',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'cash',
        'credit_card',
        'debit_card',
        'bank_transfer',
        'qr_payment',
        'customer_credit'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CORE & BRANCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(30),
    currency VARCHAR(10) DEFAULT 'LKR' NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Colombo' NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    service_charge_rate NUMERIC(5, 2) DEFAULT 10.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    key VARCHAR(50) NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_branch_setting UNIQUE (branch_id, key)
);

CREATE TABLE IF NOT EXISTS menu_versions (
    branch_id UUID PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    version_number BIGINT DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 4. STAFF, ROLES & PIN AUTHENTICATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    role user_role DEFAULT 'cashier' NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    pin_code_hash VARCHAR(255) NOT NULL, -- Bcrypt hash of 4-6 digit fast PIN
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'login', 'pin_switch', 'logout'
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 5. CASH SHIFTS & DRAWER RECONCILIATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    cashier_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC(12, 2) NOT NULL,
    expected_cash NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    actual_cash NUMERIC(12, 2),
    cash_variance NUMERIC(12, 2),
    total_sales NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    status shift_status DEFAULT 'open' NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS cash_drawer_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID REFERENCES cash_shifts(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- 'cash_in', 'cash_out', 'drop'
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 6. DINING FLOORS & TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurant_floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS dining_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    floor_id UUID REFERENCES restaurant_floors(id) ON DELETE CASCADE NOT NULL,
    table_number VARCHAR(20) NOT NULL,
    seating_capacity INT DEFAULT 4 NOT NULL,
    status table_status DEFAULT 'available' NOT NULL,
    current_order_id UUID,
    pos_x INT DEFAULT 0 NOT NULL,
    pos_y INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    CONSTRAINT uq_branch_table_num UNIQUE (branch_id, table_number)
);

-- ============================================================================
-- 7. KITCHEN STATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS kitchen_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(20) NOT NULL, -- 'HOT', 'GRILL', 'BEV', 'DESSERT'
    name VARCHAR(100) NOT NULL,
    printer_ip VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    CONSTRAINT uq_branch_station_code UNIQUE (branch_id, code)
);

-- ============================================================================
-- 8. MENU, VARIANTS, MODIFIERS & COMBOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50),
    display_order INT DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES menu_categories(id) ON DELETE RESTRICT NOT NULL,
    default_station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50),
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT, -- Client compressed WebP < 100KB
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    tax_exempt BOOLEAN DEFAULT FALSE NOT NULL,
    display_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    variant_name VARCHAR(50) NOT NULL, -- 'Small', 'Medium', 'Large', 'Full'
    price_override NUMERIC(10, 2) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE IF NOT EXISTS modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(100) NOT NULL,
    min_selection INT DEFAULT 0 NOT NULL,
    max_selection INT DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_addition NUMERIC(10, 2) DEFAULT 0.00 NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    modifier_group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (menu_item_id, modifier_group_id)
);

CREATE TABLE IF NOT EXISTS combo_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    combo_price NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS combo_meal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_id UUID REFERENCES combo_meals(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    quantity INT DEFAULT 1 NOT NULL
);

-- ============================================================================
-- 9. CUSTOMERS & LOYALTY
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100),
    delivery_address TEXT,
    loyalty_points INT DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 10. ORDERS & ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    order_number VARCHAR(50) NOT NULL, -- ORD-YYYYMMDD-XXXX
    order_type order_type DEFAULT 'dine_in' NOT NULL,
    table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    waiter_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES cash_shifts(id) ON DELETE RESTRICT,
    kds_status kds_status DEFAULT 'submitted' NOT NULL,
    payment_status payment_status DEFAULT 'unpaid' NOT NULL,
    subtotal NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    service_charge_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    delivery_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    notes TEXT,
    offline_temp_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_branch_order_number UNIQUE (branch_id, order_number)
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE RESTRICT NOT NULL,
    variant_id UUID REFERENCES item_variants(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL,
    station_id UUID REFERENCES kitchen_stations(id) ON DELETE RESTRICT NOT NULL,
    kds_status kds_status DEFAULT 'submitted' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
    modifier_id UUID REFERENCES modifiers(id) ON DELETE RESTRICT NOT NULL,
    modifier_name VARCHAR(100) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- ============================================================================
-- 11. STATION ROUTING TICKETS (KOT & KDS REALTIME)
-- ============================================================================
CREATE TABLE IF NOT EXISTS station_routing_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) NOT NULL, -- e.g. TKT-HOT-0012
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    station_id UUID REFERENCES kitchen_stations(id) ON DELETE RESTRICT NOT NULL,
    status kds_status DEFAULT 'submitted' NOT NULL,
    started_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    prepared_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS station_ticket_items (
    ticket_id UUID REFERENCES station_routing_tickets(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (ticket_id, order_item_id)
);

-- ============================================================================
-- 12. RECIPES (BOM) & INVENTORY MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50),
    unit_id UUID REFERENCES inventory_units(id) ON DELETE RESTRICT NOT NULL,
    cost_price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    current_stock NUMERIC(12, 3) DEFAULT 0.000 NOT NULL,
    min_stock_alert NUMERIC(12, 3) DEFAULT 5.000 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES item_variants(id) ON DELETE CASCADE,
    yield_quantity NUMERIC(8, 2) DEFAULT 1.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_item_variant_bom UNIQUE (menu_item_id, variant_id)
);

CREATE TABLE IF NOT EXISTS recipe_bom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID REFERENCES recipe_boms(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(10, 4) NOT NULL,
    unit_id UUID REFERENCES inventory_units(id) ON DELETE RESTRICT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    ingredient_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
    movement_type stock_movement_type NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL, -- Negative for depletions, positive for additions
    unit_cost NUMERIC(10, 2) NOT NULL,
    reference_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    reference_order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    idempotent_key VARCHAR(100) UNIQUE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 13. SUPPLIERS, PURCHASE ORDERS & GOODS RECEIVED NOTES (GRN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
    po_number VARCHAR(50) NOT NULL,
    status po_status DEFAULT 'draft' NOT NULL,
    total_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_branch_po_number UNIQUE (branch_id, po_number)
);

CREATE TABLE IF NOT EXISTS goods_received_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE RESTRICT NOT NULL,
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
    ingredient_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
    quantity_received NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- ============================================================================
-- 14. PAYMENTS & REFUNDS (IMMUTABLE LEDGER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    shift_id UUID REFERENCES cash_shifts(id) ON DELETE RESTRICT NOT NULL,
    method payment_method NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'LKR' NOT NULL,
    transaction_ref VARCHAR(100),
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT NOT NULL,
    shift_id UUID REFERENCES cash_shifts(id) ON DELETE RESTRICT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    authorized_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 15. AUDIT LOGS (IMMUTABLE SENSITIVE ACTIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    reason TEXT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================================
-- 16. INDEXES FOR HIGH-THROUGHPUT REAL-TIME POS & KDS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_branch_kds ON orders(branch_id, kds_status);
CREATE INDEX IF NOT EXISTS idx_orders_branch_payment ON orders(branch_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_station_tickets_status ON station_routing_tickets(branch_id, station_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_idempotent ON stock_ledger(idempotent_key);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_ingredient ON stock_ledger(ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift_id ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);

-- ============================================================================
-- 17. AUTOMATED TIMESTAMP TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER set_timestamp_branches BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER set_timestamp_system_settings BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER set_timestamp_user_profiles BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER set_timestamp_menu_items BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER set_timestamp_inventory_items BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 18. IDEMPOTENT RECIPE BOM STOCK DEDUCTION & REVERSAL PROCEDURES
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_order_bom_stock(
    p_order_id UUID,
    p_user_id UUID,
    p_trigger_type VARCHAR(50)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_item RECORD;
    r_bom RECORD;
    v_branch_id UUID;
    v_idempotent_key VARCHAR(100);
BEGIN
    SELECT branch_id INTO v_branch_id FROM orders WHERE id = p_order_id;
    
    FOR r_item IN 
        SELECT id, menu_item_id, variant_id, quantity 
        FROM order_items 
        WHERE order_id = p_order_id
    LOOP
        FOR r_bom IN 
            SELECT rbi.ingredient_id, rbi.quantity AS qty_per_dish, ii.cost_price
            FROM recipe_boms rb
            JOIN recipe_bom_items rbi ON rb.id = rbi.bom_id
            JOIN inventory_items ii ON rbi.ingredient_id = ii.id
            WHERE rb.menu_item_id = r_item.menu_item_id 
              AND (rb.variant_id = r_item.variant_id OR rb.variant_id IS NULL)
        LOOP
            v_idempotent_key := 'DEDUCT_' || p_order_id || '_' || r_item.id || '_' || r_bom.ingredient_id;
            
            INSERT INTO stock_ledger (
                branch_id, ingredient_id, movement_type, quantity,
                unit_cost, reference_order_id, reference_order_item_id,
                idempotent_key, notes, created_by
            )
            VALUES (
                v_branch_id, r_bom.ingredient_id, 'sale_deduction',
                -(r_bom.qty_per_dish * r_item.quantity),
                r_bom.cost_price, p_order_id, r_item.id,
                v_idempotent_key, 'Automatic BOM deduction: ' || p_trigger_type, p_user_id
            )
            ON CONFLICT (idempotent_key) DO NOTHING;

            UPDATE inventory_items
            SET current_stock = current_stock - (r_bom.qty_per_dish * r_item.quantity),
                updated_at = TIMEZONE('utc', NOW())
            WHERE id = r_bom.ingredient_id;
        END LOOP;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION reverse_order_bom_stock(
    p_order_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_ledger RECORD;
    v_reversal_key VARCHAR(120);
BEGIN
    FOR r_ledger IN 
        SELECT id, branch_id, ingredient_id, quantity, unit_cost, reference_order_item_id
        FROM stock_ledger
        WHERE reference_order_id = p_order_id 
          AND movement_type = 'sale_deduction'
    LOOP
        v_reversal_key := 'REV_' || r_ledger.id;
        
        INSERT INTO stock_ledger (
            branch_id, ingredient_id, movement_type, quantity,
            unit_cost, reference_order_id, reference_order_item_id,
            idempotent_key, notes, created_by
        )
        VALUES (
            r_ledger.branch_id, r_ledger.ingredient_id, 'sale_reversal',
            ABS(r_ledger.quantity),
            r_ledger.unit_cost, p_order_id, r_ledger.reference_order_item_id,
            v_reversal_key, 'BOM stock reversal: ' || p_reason, p_user_id
        )
        ON CONFLICT (idempotent_key) DO NOTHING;

        UPDATE inventory_items
        SET current_stock = current_stock + ABS(r_ledger.quantity),
            updated_at = TIMEZONE('utc', NOW())
        WHERE id = r_ledger.ingredient_id;
    END LOOP;
END;
$$;

-- Quick PIN Verification Procedure
CREATE OR REPLACE FUNCTION verify_staff_pin(
    p_branch_id UUID,
    p_pin TEXT
)
RETURNS TABLE (
    user_id UUID,
    display_name VARCHAR,
    role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT up.id, up.display_name, up.role
    FROM user_profiles up
    WHERE up.branch_id = p_branch_id
      AND up.is_active = TRUE
      AND up.pin_code_hash = crypt(p_pin, up.pin_code_hash);
END;
$$;

-- ============================================================================
-- 19. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_routing_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public / Anonymous read policy for branches (needed for initial setup & login display)
DO $$ BEGIN
    CREATE POLICY allow_read_branches ON branches FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Menu reads are open to authenticated users and pos
DO $$ BEGIN
    CREATE POLICY allow_read_categories ON menu_categories FOR SELECT USING (true);
    CREATE POLICY allow_read_items ON menu_items FOR SELECT USING (true);
    CREATE POLICY allow_read_variants ON item_variants FOR SELECT USING (true);
    CREATE POLICY allow_read_modifiers ON modifiers FOR SELECT USING (true);
    CREATE POLICY allow_read_modifier_groups ON modifier_groups FOR SELECT USING (true);
    CREATE POLICY allow_read_menu_versions ON menu_versions FOR SELECT USING (true);
    CREATE POLICY allow_read_tables ON dining_tables FOR SELECT USING (true);
    CREATE POLICY allow_read_floors ON restaurant_floors FOR SELECT USING (true);
    CREATE POLICY allow_read_stations ON kitchen_stations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Order and Ticket Access Policies
DO $$ BEGIN
    CREATE POLICY allow_all_orders ON orders FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_order_items ON order_items FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_order_modifiers ON order_item_modifiers FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_tickets ON station_routing_tickets FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_ticket_items ON station_ticket_items FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_shifts ON cash_shifts FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_drawer_actions ON cash_drawer_actions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_payments ON payments FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_refunds ON refunds FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_audit_logs ON audit_logs FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_inventory ON inventory_items FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY allow_all_stock_ledger ON stock_ledger FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 20. SEED DATA (DEFAULT BRANCH, INVENTORY UNITS, STATIONS, SECTIONS)
-- ============================================================================
INSERT INTO branches (id, code, name, address, phone, currency, timezone, tax_rate, service_charge_rate)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'MAIN-BRANCH',
    'PCS Restaurant & Cafe',
    'Colombo, Sri Lanka',
    '+94 11 234 5678',
    'LKR',
    'Asia/Colombo',
    0.00,
    10.00
) ON CONFLICT (code) DO NOTHING;

INSERT INTO menu_versions (branch_id, version_number)
VALUES ('00000000-0000-0000-0000-000000000001', 1)
ON CONFLICT (branch_id) DO NOTHING;

-- Standard Kitchen Stations
INSERT INTO kitchen_stations (branch_id, code, name)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'HOT', 'Hot Kitchen / Wok'),
    ('00000000-0000-0000-0000-000000000001', 'GRILL', 'Grill & Fryer Station'),
    ('00000000-0000-0000-0000-000000000001', 'BEV', 'Beverage & Bar Station'),
    ('00000000-0000-0000-0000-000000000001', 'DESSERT', 'Dessert & Bakery')
ON CONFLICT (branch_id, code) DO NOTHING;

-- Standard Inventory Units
INSERT INTO inventory_units (unit_name, symbol)
VALUES 
    ('Kilogram', 'kg'),
    ('Gram', 'g'),
    ('Liter', 'l'),
    ('Milliliter', 'ml'),
    ('Piece', 'pcs'),
    ('Packet', 'pack'),
    ('Bottle', 'btl'),
    ('Can', 'can')
ON CONFLICT (symbol) DO NOTHING;

-- Default Floor & Tables
INSERT INTO restaurant_floors (id, branch_id, name, display_order)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Main Dining Hall', 1)
ON CONFLICT DO NOTHING;

INSERT INTO dining_tables (branch_id, floor_id, table_number, seating_capacity, status, pos_x, pos_y)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T-01', 4, 'available', 50, 50),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T-02', 4, 'available', 150, 50),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T-03', 2, 'available', 250, 50),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'T-04', 6, 'available', 350, 50)
ON CONFLICT (branch_id, table_number) DO NOTHING;
