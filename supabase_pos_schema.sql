-- ================================================================
-- EBS ENTERPRISE BUSINESS SYSTEM — SUPABASE POSTGRESQL SCHEMA
-- Target Schema: "pos"
-- ================================================================

CREATE SCHEMA IF NOT EXISTS pos;

-- Grant usage on schema to standard roles
GRANT USAGE, CREATE ON SCHEMA pos TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- 1. BUSINESSES (Wamiliki na Maduka)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_id TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    mkoa TEXT,
    wilaya TEXT,
    business_type TEXT DEFAULT 'general',
    currency TEXT DEFAULT 'TZS',
    timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    branches JSONB DEFAULT '[]'::jsonb,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. DEVICES (Vifaa Vilivyosajiliwa)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.devices (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT DEFAULT 'web',
    app_version TEXT DEFAULT '1.3.0',
    database_version TEXT DEFAULT '1.3.0',
    assigned_user_id TEXT,
    assigned_user_name TEXT,
    assigned_role TEXT,
    status TEXT DEFAULT 'online',
    is_online BOOLEAN DEFAULT true,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_devices_business ON pos.devices(business_id);

-- ----------------------------------------------------------------
-- 3. USERS (Watumiaji na Wafanyakazi)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.users (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    branch_id TEXT,
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'boss', 'manager', 'cashier', 'waiter', 'storekeeper', 'accountant', 'admin')),
    phone TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT,
    pin TEXT,
    pin_salt TEXT,
    active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    lockout_until TIMESTAMPTZ,
    permissions JSONB DEFAULT '{}'::jsonb,
    can_discount BOOLEAN DEFAULT false,
    can_refund BOOLEAN DEFAULT false,
    can_adjust_stock BOOLEAN DEFAULT false,
    can_view_profit BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    UNIQUE(business_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_business ON pos.users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON pos.users(username);

-- Compatibility view for app_users
CREATE OR REPLACE VIEW pos.app_users AS SELECT * FROM pos.users;

-- ----------------------------------------------------------------
-- 4. USER SESSIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES pos.users(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON pos.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON pos.sessions(user_id);

-- ----------------------------------------------------------------
-- 5. PRODUCTS (Bidhaa, Bei, Stoo na Vifungashio)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    branch_id TEXT,
    name TEXT NOT NULL,
    barcode TEXT,
    sku TEXT,
    category TEXT NOT NULL,
    buying_price NUMERIC(12, 2) DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL,
    stock_qty NUMERIC(12, 2) NOT NULL DEFAULT 0, -- In base units
    min_stock NUMERIC(12, 2) DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'Pcs',
    base_unit TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    active BOOLEAN DEFAULT true,
    product_type TEXT DEFAULT 'standard',
    
    -- Packaging Units (Crate / Boksi / Katoni)
    packaging_units JSONB DEFAULT '[]'::jsonb,

    -- Bar Specific
    is_bar_item BOOLEAN DEFAULT false,
    bottle_size_ml NUMERIC(10, 2) DEFAULT 750,
    serving_size_ml NUMERIC(10, 2) DEFAULT 30,
    servings_per_bottle NUMERIC(10, 2) DEFAULT 25,
    selling_price_per_serving NUMERIC(12, 2) DEFAULT 0,
    open_bottle_remaining_ml NUMERIC(10, 2),
    open_bottles_count INT DEFAULT 0,

    -- Pharmacy Specific
    is_pharmacy_item BOOLEAN DEFAULT false,
    brand_name TEXT,
    generic_name TEXT,
    batch_number TEXT,
    expiry_date DATE,
    dosage_form TEXT,
    strength TEXT,
    medicine_type TEXT,
    dosage_instruction TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON pos.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON pos.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON pos.products(category);

-- ----------------------------------------------------------------
-- 6. SALES (Mauzo na Risiti)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.sales (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    device_id TEXT,
    device_name TEXT,
    client_transaction_id TEXT,
    sync_status TEXT DEFAULT 'synced',
    invoice_no TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    tax NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    profit NUMERIC(12, 2) NOT NULL,
    payments JSONB NOT NULL,
    payment_method TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    cashier_id TEXT,
    cashier_name TEXT,
    status TEXT DEFAULT 'completed',
    table_id TEXT,
    table_name TEXT,
    waiter_id TEXT,
    waiter_name TEXT,
    notes TEXT,
    camera_event_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Pharmacy specific
    patient_name TEXT,
    patient_phone TEXT,
    doctor_name TEXT,
    prescription_number TEXT,
    pharmacist_name TEXT,
    is_dispensing BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sales_business ON pos.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON pos.sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON pos.sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_client_tx ON pos.sales(client_transaction_id);

-- ----------------------------------------------------------------
-- 7. STOCK MOVEMENTS (Miondoko ya Stoo)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.stock_movements (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    branch_id TEXT,
    device_id TEXT,
    product_id TEXT NOT NULL REFERENCES pos.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    previous_stock NUMERIC(12, 2) NOT NULL,
    new_stock NUMERIC(12, 2) NOT NULL,
    unit TEXT NOT NULL,
    reference_id TEXT,
    reason TEXT NOT NULL,
    note TEXT,
    user_id TEXT,
    user_name TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    variance_ml NUMERIC(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_biz ON pos.stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON pos.stock_movements(product_id);

-- ----------------------------------------------------------------
-- 8. CUSTOMERS (Wateja)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.customers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0,
    current_debt NUMERIC(12, 2) DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0,
    transaction_count INT DEFAULT 0,
    last_purchase_date TIMESTAMPTZ,
    loyalty_points NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_biz ON pos.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON pos.customers(phone);

-- ----------------------------------------------------------------
-- 9. DEBTS (Madeni ya Wateja)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.debts (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES pos.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    sale_id TEXT,
    invoice_no TEXT,
    original_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
    due_date DATE,
    notes TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_debts_biz ON pos.debts(business_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON pos.debts(customer_id);

-- ----------------------------------------------------------------
-- 10. SUPPLIERS (Wasambazaji)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.suppliers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    categories JSONB DEFAULT '[]'::jsonb,
    lead_time_days INT DEFAULT 3,
    payment_terms TEXT,
    rating NUMERIC(3, 1) DEFAULT 5.0,
    active BOOLEAN DEFAULT true,
    total_purchases NUMERIC(12, 2) DEFAULT 0,
    outstanding_balance NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_biz ON pos.suppliers(business_id);

-- ----------------------------------------------------------------
-- 11. EXPENSES (Matumizi na Gharama)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.expenses (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    device_id TEXT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    recorded_by TEXT,
    receipt_url TEXT,
    approved_by TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_biz ON pos.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON pos.expenses(date);

-- ----------------------------------------------------------------
-- 12. RESTAURANT TABLES (Meza za Bar/Restaurant)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.tables (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity INT DEFAULT 4,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    current_sale_id TEXT,
    waiter_id TEXT,
    waiter_name TEXT,
    occupied_since TIMESTAMPTZ,
    guest_count INT,
    total_amount NUMERIC(12, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tables_biz ON pos.tables(business_id);

-- ----------------------------------------------------------------
-- 13. BAR VARIANCES (Ukaguzi wa Chupa na Shots)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.bar_variances (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shift TEXT,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    expected_shots NUMERIC(10, 2) NOT NULL,
    actual_shots NUMERIC(10, 2) NOT NULL,
    variance_shots NUMERIC(10, 2) NOT NULL,
    loss_amount NUMERIC(12, 2) DEFAULT 0,
    bartender_name TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_bar_variances_biz ON pos.bar_variances(business_id);

-- ----------------------------------------------------------------
-- 14. CCTV CAMERAS & CAMERA EVENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.cameras (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    stream_url TEXT,
    ai_status TEXT DEFAULT 'online',
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pos.camera_events (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    camera_id TEXT,
    camera_name TEXT,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    thumbnail_url TEXT,
    sale_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camera_events_biz ON pos.camera_events(business_id);

-- ----------------------------------------------------------------
-- 15. AUDIT LOGS (Kumbukumbu za Usalama)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.audit_logs (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    device_id TEXT,
    device_name TEXT,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    entity_type TEXT,
    entity_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_biz ON pos.audit_logs(business_id);

-- ----------------------------------------------------------------
-- 16. SYNC TRANSACTIONS (Offline Queue Reconciliation)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.sync_transactions (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    local_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'conflict')),
    payload JSONB NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_tx_biz ON pos.sync_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_tx_local ON pos.sync_transactions(local_id);

-- ----------------------------------------------------------------
-- 17. PLATFORM ADMINS (EBS Head Office / Super Admin)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.platform_admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT,
    role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role = 'super_admin'),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- ----------------------------------------------------------------
-- 18. SUPER ADMIN ACTIONS (Ukaguzi wa Vitendo vya Super Admin)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.super_admin_actions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_business_id TEXT,
    target_business_name TEXT,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_actions_target ON pos.super_admin_actions(target_business_id);

-- ----------------------------------------------------------------
-- 19. PASSWORD RESET TOKENS (Urejeshaji wa Nenosiri)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos.password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES pos.users(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES pos.businesses(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    otp_code TEXT NOT NULL,
    contact_method TEXT NOT NULL CHECK (contact_method IN ('phone', 'email')),
    contact_target TEXT NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pw_tokens_user ON pos.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pw_tokens_token ON pos.password_reset_tokens(token);

-- ----------------------------------------------------------------
-- 20. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------
ALTER TABLE pos.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.bar_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.camera_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos.sync_transactions ENABLE ROW LEVEL SECURITY;

-- Explicit registration policies for new businesses and owner users:
DROP POLICY IF EXISTS "Allow public business registration" ON pos.businesses;
CREATE POLICY "Allow public business registration"
    ON pos.businesses
    FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public business select" ON pos.businesses;
CREATE POLICY "Allow public business select"
    ON pos.businesses
    FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow public owner user registration" ON pos.users;
CREATE POLICY "Allow public owner user registration"
    ON pos.users
    FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public users select" ON pos.users;
CREATE POLICY "Allow public users select"
    ON pos.users
    FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

-- Service role has full access bypass for server-side operations
-- For authenticated app clients, restrict to matching business_id:
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'pos' AND table_name NOT IN ('platform_admins', 'super_admin_actions', 'businesses', 'users')
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS biz_isolation_policy ON pos.%I;
            CREATE POLICY biz_isolation_policy ON pos.%I
                FOR ALL
                TO authenticated, anon, service_role
                USING (
                    auth.role() = ''service_role'' OR
                    business_id = coalesce(current_setting(''app.current_business_id'', true), business_id)
                )
                WITH CHECK (
                    auth.role() = ''service_role'' OR
                    business_id = coalesce(current_setting(''app.current_business_id'', true), business_id)
                );
        ', tbl, tbl);
    END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 21. POSTGRES RPC: execute_sale_atomic (SECURITY DEFINER)
-- Prevents race conditions when 2 devices sell the same product!
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION pos.execute_sale_atomic(
    p_business_id TEXT,
    p_sale_data JSONB,
    p_device_id TEXT,
    p_user_id TEXT,
    p_client_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_sale RECORD;
    v_item RECORD;
    v_product RECORD;
    v_prev_stock NUMERIC;
    v_qty_to_deduct NUMERIC;
    v_sale_id TEXT;
    v_invoice_no TEXT;
    v_subtotal NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_total_discount NUMERIC := 0;
    v_final_total NUMERIC;
    v_final_profit NUMERIC;
    v_now TIMESTAMPTZ := NOW();
    v_user_name TEXT := 'Keshia';
    v_device_name TEXT := 'POS Device';
    v_sale_result JSONB;
BEGIN
    -- 1. Idempotency Check: if client_transaction_id already processed, return existing
    IF p_client_transaction_id IS NOT NULL AND p_client_transaction_id <> '' THEN
        SELECT * INTO v_existing_sale FROM pos.sales 
        WHERE business_id = p_business_id 
          AND (client_transaction_id = p_client_transaction_id OR id = p_client_transaction_id)
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'sale', to_jsonb(v_existing_sale),
                'idempotent', true
            );
        END IF;
    END IF;

    -- 2. Resolve User and Device Names
    SELECT name INTO v_user_name FROM pos.users WHERE id = p_user_id AND business_id = p_business_id;
    SELECT name INTO v_device_name FROM pos.devices WHERE id = p_device_id AND business_id = p_business_id;

    v_sale_id := COALESCE(p_sale_data->>'id', 'sale-' || floor(extract(epoch from v_now)*1000)::text || '-' || substr(md5(random()::text), 1, 5));
    v_invoice_no := COALESCE(p_sale_data->>'invoiceNo', 'INV-' || to_char(v_now, 'YYYY') || '-' || lpad((SELECT count(*)+1 FROM pos.sales WHERE business_id = p_business_id)::text, 5, '0'));

    -- 3. Loop through items with ROW-LEVEL LOCKING (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_sale_data->'items') AS (
        "productId" TEXT,
        "productName" TEXT,
        "quantity" NUMERIC,
        "unitPrice" NUMERIC,
        "costPrice" NUMERIC,
        "discount" NUMERIC,
        "total" NUMERIC,
        "isServing" BOOLEAN,
        "servingSizeMl" NUMERIC,
        "isPackage" BOOLEAN,
        "unitsPerPackage" NUMERIC
    )
    LOOP
        -- Lock product row exclusively
        SELECT * INTO v_product FROM pos.products 
        WHERE id = v_item."productId" AND business_id = p_business_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bidhaa % haijapatikana.', v_item."productId";
        END IF;

        v_prev_stock := v_product.stock_qty;

        -- Calculate stock deduction in base units
        IF v_item."isPackage" IS TRUE AND v_item."unitsPerPackage" > 0 THEN
            v_qty_to_deduct := v_item."quantity" * v_item."unitsPerPackage";
        ELSIF v_item."isServing" IS TRUE AND v_product.is_bar_item IS TRUE THEN
            -- Shots deduction logic
            v_qty_to_deduct := 0; -- Handled via open bottle ML or 1 bottle decrement if empty
            DECLARE
                v_serving_ml NUMERIC := COALESCE(v_item."servingSizeMl", v_product.serving_size_ml, 30);
                v_bottle_ml NUMERIC := COALESCE(v_product.bottle_size_ml, 750);
                v_open_ml NUMERIC := COALESCE(v_product.open_bottle_remaining_ml, v_bottle_ml);
            BEGIN
                IF v_open_ml < v_serving_ml THEN
                    IF v_product.stock_qty > 0 THEN
                        v_qty_to_deduct := 1;
                        v_open_ml := (v_open_ml + v_bottle_ml) - v_serving_ml;
                    ELSE
                        v_open_ml := GREATEST(0, v_open_ml - v_serving_ml);
                    END IF;
                ELSE
                    v_open_ml := v_open_ml - v_serving_ml;
                END IF;

                UPDATE pos.products SET 
                    stock_qty = GREATEST(0, stock_qty - v_qty_to_deduct),
                    open_bottle_remaining_ml = v_open_ml,
                    updated_at = v_now
                WHERE id = v_product.id;
            END;
        ELSE
            v_qty_to_deduct := v_item."quantity";
            UPDATE pos.products SET 
                stock_qty = GREATEST(0, stock_qty - v_qty_to_deduct),
                updated_at = v_now
            WHERE id = v_product.id;
        END IF;

        -- Insert Stock Movement Record
        INSERT INTO pos.stock_movements (
            id, business_id, device_id, product_id, product_name, type,
            quantity, previous_stock, new_stock, unit, reference_id,
            reason, user_id, user_name, timestamp
        ) VALUES (
            'mov-' || floor(extract(epoch from v_now)*1000)::text || '-' || substr(md5(random()::text), 1, 4),
            p_business_id, p_device_id, v_product.id, v_product.name, 'sale',
            -v_qty_to_deduct, v_prev_stock, GREATEST(0, v_prev_stock - v_qty_to_deduct), v_product.unit,
            v_invoice_no, 'Mauzo ya POS (' || v_invoice_no || ')', p_user_id, COALESCE(v_user_name, 'Keshia'), v_now
        );

        v_subtotal := v_subtotal + (v_item."unitPrice" * v_item."quantity");
        v_total_discount := v_total_discount + COALESCE(v_item."discount", 0);
        v_total_cost := v_total_cost + (COALESCE(v_item."costPrice", v_product.buying_price, 0) * v_item."quantity");
    END LOOP;

    v_final_total := COALESCE((p_sale_data->>'total')::numeric, v_subtotal - v_total_discount);
    v_final_profit := COALESCE((p_sale_data->>'profit')::numeric, v_final_total - v_total_cost);

    -- 4. Insert Sale Record
    INSERT INTO pos.sales (
        id, business_id, device_id, device_name, client_transaction_id, sync_status,
        invoice_no, items, subtotal, discount, tax, total, profit,
        payments, payment_method, customer_id, customer_name, customer_phone,
        cashier_id, cashier_name, status, table_id, table_name, waiter_id, waiter_name,
        notes, timestamp
    ) VALUES (
        v_sale_id, p_business_id, p_device_id, v_device_name, p_client_transaction_id, 'synced',
        v_invoice_no, p_sale_data->'items', v_subtotal, v_total_discount, COALESCE((p_sale_data->>'tax')::numeric, 0),
        v_final_total, v_final_profit, COALESCE(p_sale_data->'payments', '[]'::jsonb),
        COALESCE(p_sale_data->>'paymentMethod', 'cash'),
        p_sale_data->>'customerId', p_sale_data->>'customerName', p_sale_data->>'customerPhone',
        p_user_id, COALESCE(v_user_name, 'Keshia'), 'completed',
        p_sale_data->>'tableId', p_sale_data->>'tableName', p_sale_data->>'waiterId', p_sale_data->>'waiterName',
        p_sale_data->>'notes', v_now
    );

    -- 5. Handle Debt if payment method is 'debt'
    IF (p_sale_data->>'paymentMethod') = 'debt' AND (p_sale_data->>'customerId') IS NOT NULL THEN
        UPDATE pos.customers SET 
            current_debt = current_debt + v_final_total,
            total_spent = total_spent + v_final_total,
            transaction_count = transaction_count + 1,
            last_purchase_date = v_now
        WHERE id = (p_sale_data->>'customerId') AND business_id = p_business_id;

        INSERT INTO pos.debts (
            id, business_id, customer_id, customer_name, customer_phone,
            sale_id, invoice_no, original_amount, paid_amount, remaining_amount,
            status, due_date, notes, created_at
        ) VALUES (
            'debt-' || floor(extract(epoch from v_now)*1000)::text,
            p_business_id, p_sale_data->>'customerId', p_sale_data->>'customerName', p_sale_data->>'customerPhone',
            v_sale_id, v_invoice_no, v_final_total, 0, v_final_total,
            'unpaid', (v_now + interval '14 days')::date, 'Mauzo ya mkopo risiti ' || v_invoice_no, v_now
        );
    END IF;

    -- 6. Insert Audit Log
    INSERT INTO pos.audit_logs (
        id, business_id, device_id, device_name, user_id, user_name, user_role,
        action, details, entity_type, entity_id, timestamp
    ) VALUES (
        'log-' || floor(extract(epoch from v_now)*1000)::text || '-' || substr(md5(random()::text), 1, 4),
        p_business_id, p_device_id, v_device_name, p_user_id, v_user_name, 'cashier',
        'Kukamilisha Mauzo #' || v_invoice_no,
        'Kiasi: TZS ' || v_final_total || ' (' || UPPER(COALESCE(p_sale_data->>'paymentMethod', 'cash')) || ')',
        'sale', v_sale_id, v_now
    );

    -- Build return object
    SELECT to_jsonb(s) INTO v_sale_result FROM pos.sales s WHERE id = v_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale', v_sale_result
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execution to API roles
GRANT EXECUTE ON FUNCTION pos.execute_sale_atomic TO postgres, anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- 22. REALTIME PUBLICATION & ALL GRANTS
-- Enable Realtime for pos.sales and pos.products & grant permissions
-- ----------------------------------------------------------------
GRANT ALL ON ALL TABLES IN SCHEMA pos TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pos TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA pos TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE pos.sales, pos.products;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if already added
    NULL;
END $$;
