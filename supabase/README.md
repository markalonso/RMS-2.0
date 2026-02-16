# Supabase Database Schema - Restaurant RMS

Complete PostgreSQL schema for a Restaurant Management System with QR ordering, inventory management, and business day tracking.

## Overview

This schema implements a full-featured restaurant POS system with:
- Single POS device operation
- QR code ordering for customers
- Manual cashier order entry
- Comprehensive inventory management
- Business day tracking with cash management
- Tax calculation (14% for dine-in only, applied after discount)
- Audit logging and soft deletes

## Database Structure

### Core Tables (20 Tables)

1. **profiles** - User management (owner/cashier roles)
2. **tables** - Restaurant table management with QR codes
3. **business_days** - Daily operations tracking
4. **sessions** - Order sessions (dine-in/takeaway/delivery)
5. **menu_categories** - Menu organization
6. **menu_items** - Products (English content only)
7. **modifier_groups** - Customization options
8. **modifiers** - Individual modifications
9. **item_modifier_groups** - Links menu items to modifiers
10. **orders** - Order requests (QR or manual)
11. **order_items** - Items in each order
12. **order_item_modifiers** - Selected modifiers
13. **bills** - Final invoices with calculations
14. **payments** - Payment records
15. **inventory_ingredients** - Stock tracking
16. **recipes** - Bill of materials (BOM)
17. **purchase_invoices** - Supplier purchases
18. **purchase_items** - Individual purchase items
19. **expenses** - Operational and admin costs
20. **waste_logs** - Inventory waste tracking
21. **audit_logs** - Complete change tracking

## Key Features

### 📱 QR Ordering System

**Customer Flow:**
1. Customer scans QR code at table
2. Anonymous user can INSERT order with status='pending'
3. Order submitted to kitchen display
4. Cashier must ACCEPT or REJECT the request
5. Only accepted orders can be printed

**Security:**
- Anonymous users can ONLY insert pending orders
- Anonymous users CANNOT read orders or bills
- QR must be enabled on table (qr_enabled = true)
- Orders restricted to active, QR-enabled tables

### 💰 Tax & Pricing Rules

```sql
-- Tax calculation logic (enforced by trigger)
1. Calculate: subtotal - discount = taxable_amount
2. If order_type = 'dine_in': tax = taxable_amount × 14%
3. If order_type = 'takeaway' OR 'delivery': tax = 0
4. Delivery orders: add manual delivery_fee
5. Total = taxable_amount + tax + delivery_fee
```

**Example Calculation:**
```
Dine-in Order:
  Subtotal:       $100.00
  Discount:       -$10.00
  ─────────────────────
  Taxable:        $90.00
  Tax (14%):      +$12.60
  ─────────────────────
  Total:          $102.60

Takeaway Order:
  Subtotal:       $100.00
  Discount:       -$10.00
  ─────────────────────
  Taxable:        $90.00
  Tax:            $0.00
  ─────────────────────
  Total:          $90.00

Delivery Order:
  Subtotal:       $100.00
  Discount:       -$10.00
  ─────────────────────
  Taxable:        $90.00
  Tax:            $0.00
  Delivery Fee:   +$5.00
  ─────────────────────
  Total:          $95.00
```

### 📦 Inventory Management

**Automatic Inventory Deduction:**
- Inventory deducts ONLY when order status = 'printed'
- Uses recipes (BOM) to calculate ingredient usage
- Prevents printing if insufficient stock
- Trigger: `deduct_inventory_on_print()`

**Stock Validation:**
```sql
-- Enforced by CHECK constraint
current_quantity >= 0  -- Cannot go negative
```

**Automatic Stock Addition:**
- Purchase items automatically add to inventory
- Waste logs automatically deduct from inventory

### 🏢 Business Day Operations

**Opening Day:**
```sql
INSERT INTO business_days (opened_by, opening_cash, status)
VALUES (user_id, 500.00, 'open');
```

**Closing Day:**
```sql
UPDATE business_days
SET status = 'closed',
    closed_at = NOW(),
    closed_by = user_id,
    closing_cash = 1234.56,
    expected_cash = 1250.00,
    cash_difference = -15.44
WHERE status = 'open';
```

**Constraint:** Only ONE business day can be open at a time.

### 🔒 Row Level Security (RLS)

#### Anonymous Users (QR Ordering)
```sql
-- CAN DO:
✅ View menu (categories, items, modifiers)
✅ Insert pending orders (source='qr', status='pending')
✅ Insert order items
✅ Insert order item modifiers

-- CANNOT DO:
❌ Read orders
❌ Update orders
❌ Read bills
❌ Read payments
❌ Access inventory
❌ Access any management data
```

#### Authenticated Staff (Cashier/Owner)
```sql
-- CAN DO:
✅ View all orders
✅ Accept/Reject QR orders
✅ Create manual orders
✅ Print orders
✅ Create bills
✅ Process payments
✅ View inventory
✅ Manage sessions
✅ View business day data

-- OWNER ONLY:
✅ Manage user profiles
✅ View audit logs
✅ Open/Close business days
```

## Triggers & Automation

### 1. Inventory Deduction on Print
```sql
-- Automatically deducts inventory when order is printed
CREATE TRIGGER trigger_deduct_inventory_on_print
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION deduct_inventory_on_print();
```

### 2. Inventory Addition on Purchase
```sql
-- Automatically adds inventory when purchase is recorded
CREATE TRIGGER trigger_add_inventory_on_purchase
    AFTER INSERT ON purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION add_inventory_on_purchase();
```

### 3. Bill Calculation
```sql
-- Automatically calculates tax and totals
CREATE TRIGGER trigger_calculate_bill_totals
    BEFORE INSERT OR UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bill_totals();
```

### 4. Order Number Generation
```sql
-- Auto-generates: ORD-20260216-0001
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();
```

### 5. Bill Number Generation
```sql
-- Auto-generates: BILL-20260216-0001
CREATE TRIGGER trigger_generate_bill_number
    BEFORE INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();
```

### 6. Audit Logging
```sql
-- Logs all changes to critical tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

## Usage Examples

### Creating a QR Order (Anonymous)

```sql
-- 1. Customer scans QR, creates session
INSERT INTO sessions (business_day_id, table_id, order_type, created_by)
VALUES (current_business_day_id, table_id, 'dine_in', system_user);

-- 2. Create pending order
INSERT INTO orders (session_id, business_day_id, source, status)
VALUES (session_id, business_day_id, 'qr', 'pending');

-- 3. Add order items
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
VALUES (order_id, item_id, 2, 12.99, 25.98);

-- 4. Add modifiers (optional)
INSERT INTO order_item_modifiers (order_item_id, modifier_id, quantity, price_adjustment)
VALUES (order_item_id, modifier_id, 1, 2.00);
```

### Cashier Accepts and Prints Order

```sql
-- 1. Cashier reviews pending orders
SELECT * FROM orders 
WHERE status = 'pending' AND source = 'qr';

-- 2. Accept order
UPDATE orders
SET status = 'accepted',
    accepted_by = cashier_id,
    accepted_at = NOW()
WHERE id = order_id;

-- 3. Print order (triggers inventory deduction)
UPDATE orders
SET status = 'printed',
    printed_at = NOW()
WHERE id = order_id;
-- ⚠️ Inventory automatically deducted here!
```

### Creating a Bill

```sql
-- 1. Calculate order totals
WITH order_totals AS (
  SELECT 
    o.session_id,
    SUM(oi.subtotal + COALESCE(
      (SELECT SUM(oim.price_adjustment * oim.quantity)
       FROM order_item_modifiers oim
       WHERE oim.order_item_id = oi.id), 0
    )) as total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.session_id = session_id
  GROUP BY o.session_id
)

-- 2. Create bill (tax calculated automatically by trigger)
INSERT INTO bills (
  session_id,
  business_day_id,
  subtotal,
  discount_amount,
  discount_percentage,
  delivery_fee,
  created_by
)
SELECT 
  session_id,
  business_day_id,
  total,
  10.00,              -- $10 discount
  NULL,
  5.00,               -- $5 delivery fee (if delivery)
  cashier_id
FROM order_totals;
```

### Processing Payment

```sql
-- 1. Create payment
INSERT INTO payments (bill_id, business_day_id, payment_method, amount, created_by)
VALUES (bill_id, business_day_id, 'cash', 102.60, cashier_id);

-- 2. Mark bill as paid
UPDATE bills
SET is_paid = true,
    paid_at = NOW(),
    paid_amount = 102.60,
    change_amount = 0
WHERE id = bill_id;
```

## Performance Optimization

### Indexes Created

```sql
-- High-traffic queries
idx_orders_status            -- Filter by order status
idx_orders_business_day      -- Daily reports
idx_bills_is_paid            -- Payment tracking
idx_tables_qr_enabled        -- QR order validation
idx_inventory_current_quantity  -- Low stock alerts
```

### Optimized Views

```sql
-- Pre-calculated aggregations
current_business_day         -- Current day info
low_stock_ingredients        -- Reorder alerts
daily_sales_summary          -- Dashboard metrics
```

## Soft Delete Strategy

Tables with `deleted_at` column:
- tables
- menu_categories
- menu_items
- modifier_groups
- modifiers
- inventory_ingredients

```sql
-- Soft delete example
UPDATE menu_items
SET deleted_at = NOW()
WHERE id = item_id;

-- Query active items only
SELECT * FROM menu_items
WHERE deleted_at IS NULL;
```

## Migration Instructions

### 1. Apply Schema

```bash
# Using Supabase CLI
supabase db push

# Or run SQL file directly
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/20260216_initial_schema.sql
```

### 2. Create First User

```sql
-- After user signs up via Supabase Auth
INSERT INTO profiles (id, role, full_name, email)
VALUES (auth_user_id, 'owner', 'John Doe', 'john@example.com');
```

### 3. Set Up Initial Data

```sql
-- Create tables
INSERT INTO tables (table_number, qr_enabled, capacity) VALUES
('T1', true, 4),
('T2', true, 4),
('T3', true, 2),
('T4', false, 6);

-- Create menu categories
INSERT INTO menu_categories (name, display_order) VALUES
('Appetizers', 1),
('Main Course', 2),
('Beverages', 3),
('Desserts', 4);

-- Create menu items
INSERT INTO menu_items (category_id, name, description, price) VALUES
(category_id, 'Burger', 'Delicious beef burger with cheese', 12.99),
(category_id, 'Pizza', 'Classic Margherita pizza', 15.99);
```

## Security Considerations

✅ **Implemented:**
- Row Level Security on all tables
- Anonymous QR ordering (insert only)
- Customers cannot read orders/bills
- Staff authentication required for management
- Audit logging for critical operations
- Soft deletes preserve history
- CHECK constraints prevent invalid data

⚠️ **Additional Recommendations:**
1. Enable Supabase email confirmations
2. Set up MFA for owner accounts
3. Regular audit log reviews
4. Monitor for suspicious QR order patterns
5. Implement rate limiting on public endpoints

## Troubleshooting

### Issue: "Insufficient stock" error when printing

```sql
-- Check current stock
SELECT name, current_quantity, unit
FROM inventory_ingredients
WHERE id IN (
  SELECT ingredient_id FROM recipes WHERE menu_item_id = item_id
);

-- Check what's needed
SELECT 
  ii.name,
  r.quantity * oi.quantity as needed,
  ii.current_quantity as available
FROM order_items oi
JOIN recipes r ON r.menu_item_id = oi.menu_item_id
JOIN inventory_ingredients ii ON ii.id = r.ingredient_id
WHERE oi.order_id = order_id;
```

### Issue: Cannot create order (RLS denial)

```sql
-- Verify table has QR enabled
SELECT table_number, qr_enabled, is_active
FROM tables
WHERE id = table_id;

-- Verify business day is open
SELECT * FROM current_business_day;
```

## Support & Maintenance

**Schema Version:** 1.0.0  
**Last Updated:** 2026-02-16  
**Compatible with:** Supabase PostgreSQL 15+

For updates or issues, see:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## Quick Reference

### Order Status Flow
```
pending → accepted → printed → paid
         ↘ rejected
```

### Order Types
- `dine_in` - 14% tax applies
- `takeaway` - No tax
- `delivery` - No tax, add delivery fee

### User Roles
- `owner` - Full access, can manage users
- `cashier` - POS operations, cannot manage users

### Payment Methods
- `cash`
- `card`
- `bank_transfer`
- `mobile_wallet`
