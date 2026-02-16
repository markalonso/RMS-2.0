-- ============================================================================
-- Restaurant RMS - Supabase PostgreSQL Schema
-- ============================================================================
-- Description: Complete database schema for Restaurant Management System
-- Features: QR ordering, inventory management, POS, business day tracking
-- Security: RLS policies, audit logs, soft deletes
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('owner', 'cashier');

-- Order types
CREATE TYPE order_type AS ENUM ('dine_in', 'takeaway', 'delivery');

-- Order statuses
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'rejected', 'printed', 'paid', 'cancelled');

-- Order sources
CREATE TYPE order_source AS ENUM ('qr', 'manual');

-- Session statuses
CREATE TYPE session_status AS ENUM ('active', 'closed');

-- Business day statuses
CREATE TYPE business_day_status AS ENUM ('open', 'closed');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'mobile_wallet');

-- Expense types
CREATE TYPE expense_type AS ENUM ('operational', 'admin');

-- Table statuses
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Profiles (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'cashier',
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- 2. Tables
-- ============================================================================
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number TEXT NOT NULL UNIQUE,
    qr_code TEXT UNIQUE,
    qr_enabled BOOLEAN NOT NULL DEFAULT false,
    capacity INTEGER NOT NULL DEFAULT 4,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tables_table_number ON tables(table_number);
CREATE INDEX idx_tables_qr_enabled ON tables(qr_enabled);
CREATE INDEX idx_tables_is_active ON tables(is_active);
CREATE INDEX idx_tables_deleted_at ON tables(deleted_at) WHERE deleted_at IS NULL;

-- 3. Business Days
-- ============================================================================
CREATE TABLE business_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status business_day_status NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by UUID NOT NULL REFERENCES profiles(id),
    closed_by UUID REFERENCES profiles(id),
    opening_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
    closing_cash DECIMAL(10, 2),
    expected_cash DECIMAL(10, 2),
    cash_difference DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_only_one_open_day CHECK (
        status = 'closed' OR 
        NOT EXISTS (
            SELECT 1 FROM business_days 
            WHERE status = 'open' AND id != business_days.id
        )
    )
);

CREATE INDEX idx_business_days_status ON business_days(status);
CREATE INDEX idx_business_days_opened_at ON business_days(opened_at);

-- 4. Sessions
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_day_id UUID NOT NULL REFERENCES business_days(id),
    table_id UUID REFERENCES tables(id),
    order_type order_type NOT NULL,
    status session_status NOT NULL DEFAULT 'active',
    customer_name TEXT,
    customer_phone TEXT,
    guest_count INTEGER,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_business_day ON sessions(business_day_id);
CREATE INDEX idx_sessions_table ON sessions(table_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_order_type ON sessions(order_type);

-- ============================================================================
-- MENU MANAGEMENT
-- ============================================================================

-- 5. Menu Categories
-- ============================================================================
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_is_active ON menu_categories(is_active);
CREATE INDEX idx_menu_categories_display_order ON menu_categories(display_order);
CREATE INDEX idx_menu_categories_deleted_at ON menu_categories(deleted_at) WHERE deleted_at IS NULL;

-- 6. Menu Items (English content only)
-- ============================================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES menu_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    sku TEXT UNIQUE,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    prep_time_minutes INTEGER,
    display_order INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_price_positive CHECK (price >= 0),
    CONSTRAINT check_cost_positive CHECK (cost IS NULL OR cost >= 0)
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX idx_menu_items_deleted_at ON menu_items(deleted_at) WHERE deleted_at IS NULL;

-- 7. Modifier Groups
-- ============================================================================
CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    min_selection INTEGER NOT NULL DEFAULT 0,
    max_selection INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_selection_valid CHECK (min_selection <= max_selection)
);

CREATE INDEX idx_modifier_groups_is_active ON modifier_groups(is_active);
CREATE INDEX idx_modifier_groups_deleted_at ON modifier_groups(deleted_at) WHERE deleted_at IS NULL;

-- 8. Modifiers
-- ============================================================================
CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id),
    name TEXT NOT NULL,
    price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modifiers_group ON modifiers(modifier_group_id);
CREATE INDEX idx_modifiers_is_active ON modifiers(is_active);
CREATE INDEX idx_modifiers_deleted_at ON modifiers(deleted_at) WHERE deleted_at IS NULL;

-- 9. Item Modifier Groups (Link table)
-- ============================================================================
CREATE TABLE item_modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(menu_item_id, modifier_group_id)
);

CREATE INDEX idx_item_modifier_groups_item ON item_modifier_groups(menu_item_id);
CREATE INDEX idx_item_modifier_groups_group ON item_modifier_groups(modifier_group_id);

-- ============================================================================
-- ORDERS & BILLING
-- ============================================================================

-- 10. Orders
-- ============================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id),
    business_day_id UUID NOT NULL REFERENCES business_days(id),
    order_number TEXT NOT NULL UNIQUE,
    source order_source NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    accepted_by UUID REFERENCES profiles(id),
    accepted_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    printed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_business_day ON orders(business_day_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_source ON orders(source);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- 11. Order Items
-- ============================================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_quantity_positive CHECK (quantity > 0),
    CONSTRAINT check_unit_price_positive CHECK (unit_price >= 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- Order Item Modifiers
-- ============================================================================
CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_item_modifiers_item ON order_item_modifiers(order_item_id);
CREATE INDEX idx_order_item_modifiers_modifier ON order_item_modifiers(modifier_id);

-- 12. Bills
-- ============================================================================
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL UNIQUE REFERENCES sessions(id),
    business_day_id UUID NOT NULL REFERENCES business_days(id),
    bill_number TEXT NOT NULL UNIQUE,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5, 2),
    discount_reason TEXT,
    tax_percentage DECIMAL(5, 2) NOT NULL DEFAULT 14.00,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    change_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_discount_valid CHECK (discount_amount >= 0 AND discount_amount <= subtotal),
    CONSTRAINT check_tax_valid CHECK (tax_amount >= 0),
    CONSTRAINT check_total_positive CHECK (total >= 0)
);

CREATE INDEX idx_bills_session ON bills(session_id);
CREATE INDEX idx_bills_business_day ON bills(business_day_id);
CREATE INDEX idx_bills_is_paid ON bills(is_paid);
CREATE INDEX idx_bills_bill_number ON bills(bill_number);

-- 13. Payments
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id),
    business_day_id UUID NOT NULL REFERENCES business_days(id),
    payment_method payment_method NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_payment_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_payments_business_day ON payments(business_day_id);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- 14. Inventory Ingredients
-- ============================================================================
CREATE TABLE inventory_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    current_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_current_quantity_non_negative CHECK (current_quantity >= 0),
    CONSTRAINT check_min_quantity_non_negative CHECK (min_quantity >= 0)
);

CREATE INDEX idx_inventory_ingredients_is_active ON inventory_ingredients(is_active);
CREATE INDEX idx_inventory_ingredients_current_quantity ON inventory_ingredients(current_quantity);
CREATE INDEX idx_inventory_ingredients_deleted_at ON inventory_ingredients(deleted_at) WHERE deleted_at IS NULL;

-- 15. Recipes (Bill of Materials)
-- ============================================================================
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES inventory_ingredients(id),
    quantity DECIMAL(10, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_recipe_quantity_positive CHECK (quantity > 0),
    UNIQUE(menu_item_id, ingredient_id)
);

CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_id);

-- 16. Purchase Invoices
-- ============================================================================
CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    supplier_contact TEXT,
    invoice_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_invoices_invoice_number ON purchase_invoices(invoice_number);
CREATE INDEX idx_purchase_invoices_supplier ON purchase_invoices(supplier_name);
CREATE INDEX idx_purchase_invoices_is_paid ON purchase_invoices(is_paid);

-- 17. Purchase Items
-- ============================================================================
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES inventory_ingredients(id),
    quantity DECIMAL(10, 3) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_purchase_quantity_positive CHECK (quantity > 0),
    CONSTRAINT check_purchase_cost_positive CHECK (unit_cost >= 0)
);

CREATE INDEX idx_purchase_items_invoice ON purchase_items(purchase_invoice_id);
CREATE INDEX idx_purchase_items_ingredient ON purchase_items(ingredient_id);

-- 18. Expenses
-- ============================================================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_day_id UUID REFERENCES business_days(id),
    expense_type expense_type NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    receipt_number TEXT,
    expense_date DATE NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_expense_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_expenses_business_day ON expenses(business_day_id);
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

-- 19. Waste Logs
-- ============================================================================
CREATE TABLE waste_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES inventory_ingredients(id),
    quantity DECIMAL(10, 3) NOT NULL,
    reason TEXT NOT NULL,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    logged_by UUID NOT NULL REFERENCES profiles(id),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_waste_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_waste_logs_ingredient ON waste_logs(ingredient_id);
CREATE INDEX idx_waste_logs_logged_at ON waste_logs(logged_at);

-- 20. Audit Logs
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_days_updated_at BEFORE UPDATE ON business_days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modifier_groups_updated_at BEFORE UPDATE ON modifier_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modifiers_updated_at BEFORE UPDATE ON modifiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_ingredients_updated_at BEFORE UPDATE ON inventory_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON purchase_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Deduct inventory when order is printed
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_print()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    recipe_record RECORD;
    ingredient_record RECORD;
BEGIN
    -- Only deduct when status changes to 'printed'
    IF NEW.status = 'printed' AND (OLD.status IS NULL OR OLD.status != 'printed') THEN
        -- Loop through all items in the order
        FOR item_record IN 
            SELECT oi.menu_item_id, oi.quantity
            FROM order_items oi
            WHERE oi.order_id = NEW.id
        LOOP
            -- Loop through recipe ingredients for this menu item
            FOR recipe_record IN
                SELECT r.ingredient_id, r.quantity
                FROM recipes r
                WHERE r.menu_item_id = item_record.menu_item_id
            LOOP
                -- Calculate total quantity needed
                DECLARE
                    total_quantity DECIMAL(10, 3);
                BEGIN
                    total_quantity := recipe_record.quantity * item_record.quantity;
                    
                    -- Check if sufficient stock exists
                    SELECT current_quantity INTO ingredient_record
                    FROM inventory_ingredients
                    WHERE id = recipe_record.ingredient_id;
                    
                    IF ingredient_record IS NULL THEN
                        RAISE EXCEPTION 'Ingredient % not found', recipe_record.ingredient_id;
                    END IF;
                    
                    IF ingredient_record < total_quantity THEN
                        RAISE EXCEPTION 'Insufficient stock for ingredient %. Required: %, Available: %',
                            recipe_record.ingredient_id, total_quantity, ingredient_record;
                    END IF;
                    
                    -- Deduct from inventory
                    UPDATE inventory_ingredients
                    SET current_quantity = current_quantity - total_quantity
                    WHERE id = recipe_record.ingredient_id;
                END;
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory_on_print
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION deduct_inventory_on_print();

-- Function: Add inventory when purchase is created
-- ============================================================================
CREATE OR REPLACE FUNCTION add_inventory_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory_ingredients
    SET current_quantity = current_quantity + NEW.quantity,
        unit_cost = NEW.unit_cost
    WHERE id = NEW.ingredient_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_inventory_on_purchase
    AFTER INSERT ON purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION add_inventory_on_purchase();

-- Function: Deduct inventory on waste log
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_waste()
RETURNS TRIGGER AS $$
DECLARE
    current_stock DECIMAL(10, 3);
BEGIN
    SELECT current_quantity INTO current_stock
    FROM inventory_ingredients
    WHERE id = NEW.ingredient_id;
    
    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock to log waste. Available: %, Requested: %',
            current_stock, NEW.quantity;
    END IF;
    
    UPDATE inventory_ingredients
    SET current_quantity = current_quantity - NEW.quantity
    WHERE id = NEW.ingredient_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory_on_waste
    BEFORE INSERT ON waste_logs
    FOR EACH ROW
    EXECUTE FUNCTION deduct_inventory_on_waste();

-- Function: Generate order number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    day_count INTEGER;
BEGIN
    -- Count orders for this business day
    SELECT COUNT(*) + 1 INTO day_count
    FROM orders
    WHERE business_day_id = NEW.business_day_id;
    
    -- Generate order number: ORD-YYYYMMDD-####
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(day_count::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_order_number();

-- Function: Generate bill number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
    day_count INTEGER;
BEGIN
    -- Count bills for this business day
    SELECT COUNT(*) + 1 INTO day_count
    FROM bills
    WHERE business_day_id = NEW.business_day_id;
    
    -- Generate bill number: BILL-YYYYMMDD-####
    NEW.bill_number := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(day_count::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_bill_number
    BEFORE INSERT ON bills
    FOR EACH ROW
    WHEN (NEW.bill_number IS NULL)
    EXECUTE FUNCTION generate_bill_number();

-- Function: Calculate bill totals
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_bill_totals()
RETURNS TRIGGER AS $$
DECLARE
    session_order_type order_type;
    taxable_amount DECIMAL(10, 2);
BEGIN
    -- Get session order type
    SELECT s.order_type INTO session_order_type
    FROM sessions s
    WHERE s.id = NEW.session_id;
    
    -- Calculate taxable amount (after discount)
    taxable_amount := NEW.subtotal - NEW.discount_amount;
    
    -- Apply tax only for dine_in orders
    IF session_order_type = 'dine_in' THEN
        NEW.tax_amount := ROUND(taxable_amount * (NEW.tax_percentage / 100), 2);
    ELSE
        NEW.tax_amount := 0;
    END IF;
    
    -- Calculate total
    NEW.total := taxable_amount + NEW.tax_amount + NEW.delivery_fee;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bill_totals
    BEFORE INSERT OR UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bill_totals();

-- Function: Audit log trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_bills AFTER INSERT OR UPDATE OR DELETE ON bills
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_inventory AFTER UPDATE ON inventory_ingredients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Profiles
-- ============================================================================
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Owners can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Owners can manage profiles"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- ============================================================================
-- RLS POLICIES - Tables
-- ============================================================================
CREATE POLICY "Authenticated users can view active tables"
    ON tables FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true AND deleted_at IS NULL);

CREATE POLICY "Staff can manage tables"
    ON tables FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Menu (Public Read)
-- ============================================================================
CREATE POLICY "Anyone can view active menu categories"
    ON menu_categories FOR SELECT
    USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Anyone can view available menu items"
    ON menu_items FOR SELECT
    USING (is_active = true AND is_available = true AND deleted_at IS NULL);

CREATE POLICY "Anyone can view active modifier groups"
    ON modifier_groups FOR SELECT
    USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Anyone can view active modifiers"
    ON modifiers FOR SELECT
    USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Anyone can view item modifier groups"
    ON item_modifier_groups FOR SELECT
    USING (true);

CREATE POLICY "Staff can manage menu categories"
    ON menu_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage menu items"
    ON menu_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage modifier groups"
    ON modifier_groups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage modifiers"
    ON modifiers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Orders (QR Ordering)
-- ============================================================================
-- Anonymous can insert pending orders ONLY if table has QR enabled
CREATE POLICY "Anonymous can create QR orders for enabled tables"
    ON orders FOR INSERT
    WITH CHECK (
        source = 'qr' 
        AND status = 'pending'
        AND EXISTS (
            SELECT 1 FROM sessions s
            JOIN tables t ON t.id = s.table_id
            WHERE s.id = orders.session_id
            AND t.qr_enabled = true
            AND t.is_active = true
        )
    );

-- Anonymous can insert order items for their own pending QR orders
CREATE POLICY "Anonymous can add items to QR orders"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND o.source = 'qr'
            AND o.status = 'pending'
        )
    );

-- Anonymous can add modifiers to their order items
CREATE POLICY "Anonymous can add modifiers to order items"
    ON order_item_modifiers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.id = order_item_modifiers.order_item_id
            AND o.source = 'qr'
            AND o.status = 'pending'
        )
    );

-- Staff can view and manage all orders
CREATE POLICY "Staff can view all orders"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage orders"
    ON orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage order items"
    ON order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view order item modifiers"
    ON order_item_modifiers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Bills (Customers cannot read)
-- ============================================================================
CREATE POLICY "Only staff can view bills"
    ON bills FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Only staff can manage bills"
    ON bills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Only staff can view payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Only staff can manage payments"
    ON payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Business Days & Sessions
-- ============================================================================
CREATE POLICY "Staff can view business days"
    ON business_days FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage business days"
    ON business_days FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view sessions"
    ON sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage sessions"
    ON sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Inventory & Purchases
-- ============================================================================
CREATE POLICY "Staff can view inventory"
    ON inventory_ingredients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage inventory"
    ON inventory_ingredients FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view recipes"
    ON recipes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage recipes"
    ON recipes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view purchases"
    ON purchase_invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage purchases"
    ON purchase_invoices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view purchase items"
    ON purchase_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage purchase items"
    ON purchase_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Expenses & Waste
-- ============================================================================
CREATE POLICY "Staff can view expenses"
    ON expenses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage expenses"
    ON expenses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can view waste logs"
    ON waste_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage waste logs"
    ON waste_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES - Audit Logs
-- ============================================================================
CREATE POLICY "Only owners can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Current business day
CREATE VIEW current_business_day AS
SELECT *
FROM business_days
WHERE status = 'open'
ORDER BY opened_at DESC
LIMIT 1;

-- View: Low stock ingredients
CREATE VIEW low_stock_ingredients AS
SELECT 
    id,
    name,
    unit,
    current_quantity,
    min_quantity,
    (min_quantity - current_quantity) as shortage
FROM inventory_ingredients
WHERE current_quantity <= min_quantity
    AND is_active = true
    AND deleted_at IS NULL
ORDER BY (min_quantity - current_quantity) DESC;

-- View: Today's sales summary
CREATE VIEW daily_sales_summary AS
SELECT 
    bd.id as business_day_id,
    bd.opened_at::date as business_date,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.id END) as paid_orders,
    COUNT(DISTINCT CASE WHEN o.source = 'qr' THEN o.id END) as qr_orders,
    COUNT(DISTINCT CASE WHEN o.source = 'manual' THEN o.id END) as manual_orders,
    COALESCE(SUM(b.subtotal), 0) as gross_sales,
    COALESCE(SUM(b.discount_amount), 0) as total_discounts,
    COALESCE(SUM(b.tax_amount), 0) as total_tax,
    COALESCE(SUM(b.delivery_fee), 0) as total_delivery_fees,
    COALESCE(SUM(b.total), 0) as net_sales
FROM business_days bd
LEFT JOIN orders o ON o.business_day_id = bd.id
LEFT JOIN bills b ON b.business_day_id = bd.id AND b.is_paid = true
WHERE bd.status = 'open'
GROUP BY bd.id, bd.opened_at;

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- You can add initial data here or in a separate migration file
-- Example:
-- INSERT INTO menu_categories (name, description, display_order) VALUES
-- ('Appetizers', 'Start your meal right', 1),
-- ('Main Course', 'Delicious main dishes', 2),
-- ('Beverages', 'Refreshing drinks', 3),
-- ('Desserts', 'Sweet endings', 4);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- This schema provides:
-- ✅ Complete table structure (20 tables)
-- ✅ All required enums
-- ✅ Comprehensive indexes for performance
-- ✅ RLS policies for security
-- ✅ Triggers for inventory management
-- ✅ Triggers for automatic calculations
-- ✅ Audit logging
-- ✅ Soft delete support
-- ✅ Business day tracking
-- ✅ QR ordering with proper restrictions
-- ✅ Tax calculation (14% for dine_in only, after discount)
-- ✅ Inventory deduction on order print
-- ✅ Prevention of negative stock
-- ✅ Anonymous QR ordering (insert only)
-- ✅ Customer cannot read orders or bills
-- ============================================================================
