# Database Schema Diagram - Restaurant RMS

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESTAURANT RMS SCHEMA                         │
│                                                                   │
│  Core Operations │ Menu System │ Orders │ Inventory │ Finance   │
└─────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════╗
║                        CORE OPERATIONS                            ║
╚══════════════════════════════════════════════════════════════════╝

┌──────────────┐      ┌──────────────────┐      ┌─────────────┐
│   profiles   │      │  business_days   │      │   tables    │
├──────────────┤      ├──────────────────┤      ├─────────────┤
│ id (PK)      │──┐   │ id (PK)          │   ┌──│ id (PK)     │
│ role         │  │   │ status           │   │  │ table_number│
│ full_name    │  │   │ opened_at        │   │  │ qr_code     │
│ is_active    │  │   │ closed_at        │   │  │ qr_enabled  │
└──────────────┘  │   │ opening_cash     │   │  │ is_active   │
                  │   │ closing_cash     │   │  └─────────────┘
                  │   └──────────────────┘   │
                  │            │              │
                  │            ▼              │
                  │   ┌──────────────────┐   │
                  └──▶│    sessions      │◀──┘
                      ├──────────────────┤
                      │ id (PK)          │
                      │ business_day_id  │
                      │ table_id         │
                      │ order_type       │──── (dine_in/takeaway/delivery)
                      │ status           │
                      │ created_by       │
                      └──────────────────┘
                               │
                               │
╔══════════════════════════════▼═════════════════════════════════╗
║                        MENU SYSTEM                              ║
╚═════════════════════════════════════════════════════════════════╝

┌──────────────────┐         ┌─────────────────┐
│ menu_categories  │         │   menu_items    │
├──────────────────┤         ├─────────────────┤
│ id (PK)          │────┬───▶│ id (PK)         │
│ name             │    │    │ category_id     │
│ display_order    │    │    │ name (English)  │
│ is_active        │    │    │ description     │
└──────────────────┘    │    │ price           │
                        │    │ is_available    │
                        │    └─────────────────┘
                        │             │
                        │             │
                        │             ▼
                        │    ┌────────────────────────┐
                        │    │ item_modifier_groups   │
                        │    ├────────────────────────┤
                        │    │ id (PK)                │
                        │    │ menu_item_id           │
                        │    │ modifier_group_id      │
                        │    └────────────────────────┘
                        │             │
                        │             │
┌───────────────────┐  │             ▼
│ modifier_groups   │  │    ┌─────────────────┐
├───────────────────┤  │    │   modifiers     │
│ id (PK)           │──┴───▶├─────────────────┤
│ name              │       │ id (PK)         │
│ min_selection     │       │ modifier_grp_id │
│ max_selection     │       │ name            │
│ is_required       │       │ price_adjustment│
└───────────────────┘       └─────────────────┘


╔════════════════════════════════════════════════════════════════╗
║                      ORDER MANAGEMENT                           ║
╚════════════════════════════════════════════════════════════════╝

                    ┌──────────────────┐
                    │     orders       │
                    ├──────────────────┤
                    │ id (PK)          │
                    │ session_id       │◀─── from sessions
                    │ business_day_id  │
                    │ order_number     │──── AUTO: ORD-YYYYMMDD-####
                    │ source           │──── qr / manual
                    │ status           │──── pending→accepted→printed→paid
                    │ created_by       │
                    │ accepted_by      │
                    │ rejected_by      │
                    └──────────────────┘
                             │
                             │ 1:N
                             ▼
                    ┌──────────────────┐
                    │   order_items    │
                    ├──────────────────┤
                    │ id (PK)          │
                    │ order_id         │
                    │ menu_item_id     │◀─── links to menu_items
                    │ quantity         │
                    │ unit_price       │
                    │ subtotal         │
                    └──────────────────┘
                             │
                             │ 1:N
                             ▼
                    ┌──────────────────────┐
                    │ order_item_modifiers │
                    ├──────────────────────┤
                    │ id (PK)              │
                    │ order_item_id        │
                    │ modifier_id          │◀─── links to modifiers
                    │ price_adjustment     │
                    └──────────────────────┘


╔════════════════════════════════════════════════════════════════╗
║                      BILLING & PAYMENTS                         ║
╚════════════════════════════════════════════════════════════════╝

                    ┌──────────────────┐
                    │      bills       │
                    ├──────────────────┤
                    │ id (PK)          │
                    │ session_id       │◀─── 1:1 with session
                    │ business_day_id  │
                    │ bill_number      │──── AUTO: BILL-YYYYMMDD-####
                    │ subtotal         │
                    │ discount_amount  │
                    │ tax_percentage   │──── 14% (dine_in only)
                    │ tax_amount       │──── AUTO calculated
                    │ delivery_fee     │
                    │ total            │──── AUTO calculated
                    │ is_paid          │
                    └──────────────────┘
                             │
                             │ 1:N
                             ▼
                    ┌──────────────────┐
                    │    payments      │
                    ├──────────────────┤
                    │ id (PK)          │
                    │ bill_id          │
                    │ business_day_id  │
                    │ payment_method   │──── cash/card/transfer/wallet
                    │ amount           │
                    │ reference_number │
                    │ created_by       │
                    └──────────────────┘


╔════════════════════════════════════════════════════════════════╗
║                    INVENTORY MANAGEMENT                         ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────┐         ┌──────────────────┐
│ inventory_ingredients   │         │     recipes      │
├─────────────────────────┤         │ (Bill of Materials)
│ id (PK)                 │◀────────├──────────────────┤
│ name                    │         │ id (PK)          │
│ unit                    │         │ menu_item_id     │◀─── links to menu_items
│ current_quantity        │         │ ingredient_id    │
│ min_quantity            │         │ quantity         │
│ unit_cost               │         └──────────────────┘
└─────────────────────────┘
         │                                   ▲
         │                                   │
         │ Used in:                          │ Deducts on:
         ▼                                   │
┌─────────────────────────┐         ┌───────┴──────────┐
│   purchase_items        │         │  orders.status   │
├─────────────────────────┤         │   = 'printed'    │
│ id (PK)                 │         └──────────────────┘
│ purchase_invoice_id     │                  │
│ ingredient_id           │                  │ Also deducts:
│ quantity                │                  ▼
│ unit_cost               │         ┌──────────────────┐
│ total_cost              │         │   waste_logs     │
└─────────────────────────┤         ├──────────────────┤
         ▲                          │ id (PK)          │
         │                          │ ingredient_id    │
         │                          │ quantity         │
         │ N:1                      │ reason           │
         │                          │ cost             │
┌────────┴────────────────┐         │ logged_by        │
│  purchase_invoices      │         └──────────────────┘
├─────────────────────────┤
│ id (PK)                 │
│ invoice_number          │
│ supplier_name           │
│ invoice_date            │
│ total_amount            │
│ is_paid                 │
└─────────────────────────┘


╔════════════════════════════════════════════════════════════════╗
║                     FINANCIAL TRACKING                          ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────┐
│       expenses          │
├─────────────────────────┤
│ id (PK)                 │
│ business_day_id         │◀─── links to business_days
│ expense_type            │──── operational / admin
│ category                │
│ description             │
│ amount                  │
│ payment_method          │
│ expense_date            │
│ created_by              │
└─────────────────────────┘


╔════════════════════════════════════════════════════════════════╗
║                       AUDIT & SECURITY                          ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────┐
│      audit_logs         │
├─────────────────────────┤
│ id (PK)                 │
│ table_name              │──── Which table changed
│ record_id               │──── Which record
│ action                  │──── INSERT/UPDATE/DELETE
│ old_values              │──── JSONB snapshot
│ new_values              │──── JSONB snapshot
│ user_id                 │──── Who made the change
│ created_at              │──── When
└─────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        KEY RELATIONSHIPS
═══════════════════════════════════════════════════════════════════

1. business_days (1) ──→ (N) sessions ──→ (N) orders
2. sessions (1) ──→ (1) bills ──→ (N) payments
3. menu_items (1) ──→ (N) recipes ──→ (N) inventory_ingredients
4. orders (1) ──→ (N) order_items ──→ (N) order_item_modifiers
5. tables (1) ──→ (N) sessions
6. profiles (1) ──→ (N) orders, bills, payments (created_by)


═══════════════════════════════════════════════════════════════════
                      CRITICAL WORKFLOWS
═══════════════════════════════════════════════════════════════════

QR ORDERING FLOW:
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│Customer │───▶│ Session │───▶│  Order   │───▶│Cashier  │
│ (Anon)  │    │(Created)│    │(Pending) │    │(Accept) │
└─────────┘    └─────────┘    └──────────┘    └─────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ Print → Bill  │
                              │ (Inventory ↓) │
                              └───────────────┘

TAX CALCULATION:
┌──────────┐
│Order Type│
└─────┬────┘
      │
      ├─── dine_in ──→ Tax = (Subtotal - Discount) × 14%
      │
      ├─── takeaway ─→ Tax = 0
      │
      └─── delivery ─→ Tax = 0, Add delivery_fee

INVENTORY DEDUCTION:
┌───────────┐
│Order.status│
└─────┬─────┘
      │
      └─ 'printed' ──→ TRIGGER ──→ Deduct ingredients
                                    (via recipes BOM)
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        DAILY OPERATIONS                           │
└──────────────────────────────────────────────────────────────────┘

START OF DAY
    │
    ├──▶ Open Business Day (INSERT business_days)
    │    - Set opening cash
    │    - Status = 'open'
    │
    ├──▶ Customers Arrive
    │    │
    │    ├──▶ QR Scan Table
    │    │    - Create session
    │    │    - Insert pending order
    │    │    - Cashier accepts/rejects
    │    │
    │    ├──▶ Manual Order (POS)
    │    │    - Cashier creates session
    │    │    - Immediately accepted
    │    │
    │    └──▶ Order Prepared
    │         - Update status: 'printed'
    │         - ⚠️ INVENTORY DEDUCTED HERE
    │
    ├──▶ Create Bill
    │    - Calculate subtotal
    │    - Apply discount
    │    - Calculate tax (14% for dine_in)
    │    - Add delivery fee (if delivery)
    │    - Total calculated automatically
    │
    ├──▶ Process Payment
    │    - Record payment method
    │    - Mark bill as paid
    │    - Close session
    │
    ├──▶ Record Expenses
    │    - Operational costs
    │    - Administrative costs
    │
    ├──▶ Purchase Inventory
    │    - Create purchase invoice
    │    - Add purchase items
    │    - ⚠️ INVENTORY ADDED HERE
    │
    ├──▶ Log Waste
    │    - Record waste
    │    - ⚠️ INVENTORY DEDUCTED HERE
    │
    └──▶ END OF DAY
         - Close Business Day
         - Set closing cash
         - Calculate difference
         - Status = 'closed'

┌──────────────────────────────────────────────────────────────────┐
│                        REPORTS AVAILABLE                          │
└──────────────────────────────────────────────────────────────────┘

daily_sales_summary VIEW:
  - Total orders (QR vs Manual)
  - Gross sales
  - Discounts
  - Tax collected
  - Net sales

low_stock_ingredients VIEW:
  - Items below minimum quantity
  - Shortage amount
  - Reorder alerts

current_business_day VIEW:
  - Active business day info
  - Opening cash
  - Current sales
```

## Security Model

```
┌───────────────────────────────────────────────────────────────┐
│                    ROW LEVEL SECURITY                          │
└───────────────────────────────────────────────────────────────┘

ANONYMOUS (QR Ordering):
    │
    ├─ SELECT: menu_categories, menu_items, modifiers ✅
    ├─ INSERT: orders (pending only), order_items ✅
    │
    └─ BLOCKED: Read orders, bills, inventory ❌

AUTHENTICATED (Cashier):
    │
    ├─ SELECT: All operational tables ✅
    ├─ INSERT/UPDATE: Orders, bills, payments ✅
    │
    └─ BLOCKED: User management, audit logs ❌

AUTHENTICATED (Owner):
    │
    └─ ALL: Full access including user management ✅
```

---

**Legend:**
- `(PK)` = Primary Key
- `(FK)` = Foreign Key
- `1:1` = One-to-One relationship
- `1:N` = One-to-Many relationship
- `─▶` = Data flow direction
- `✅` = Allowed
- `❌` = Blocked
- `⚠️` = Automatic trigger action
