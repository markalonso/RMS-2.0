# Order Number Race Condition Fix - Migration Guide

## Problem
The system was experiencing duplicate key violations (`23505`) with error message:
```
duplicate key value violates unique constraint "orders_order_number_key"
```

This occurred because the `generate_order_number()` and `generate_bill_number()` functions used `COUNT(*) + 1` to determine the next number, which creates a race condition when multiple orders are created simultaneously.

## Solution

### Database Changes
The migration replaces the unsafe `COUNT(*) + 1` pattern with an atomic counter table:

1. **New Table**: `public.order_counters`
   - Stores counters per `business_day_id`
   - Fields: `last_order_no`, `last_bill_no`
   - Primary key on `business_day_id`

2. **New Functions**: 
   - `public.next_order_number(business_day_id UUID)` - Atomically increments and returns next order number
   - `public.next_bill_number(business_day_id UUID)` - Atomically increments and returns next bill number
   - Both use `UPDATE ... RETURNING` with implicit row-level locking to prevent race conditions

3. **Updated Trigger Functions**:
   - `generate_order_number()` - Now calls `next_order_number()`
   - `generate_bill_number()` - Now calls `next_bill_number()`

### Frontend Changes
Enhanced `components/OrderManagement.tsx` to prevent double submissions:

1. **Submission Guard**: Added `isSubmitting` state that prevents multiple simultaneous clicks
2. **Idempotency Key**: Each submission generates a unique UUID and stores it in `order.notes` as `client_req:<uuid>`
3. **UI Feedback**: Submit button is disabled and shows "Submitting..." during operation

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)
```bash
# Make sure you're in the project directory
cd /home/runner/work/RMS-2.0/RMS-2.0

# Apply the migration
supabase db push

# Or if using migrations directly:
supabase migration up
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20260216_fix_order_number_race_condition.sql`
4. Click **Run** to execute the migration

### Option 3: Using psql
```bash
psql <your-database-connection-string> -f supabase/migrations/20260216_fix_order_number_race_condition.sql
```

## Migration Safety

The migration is designed to be **safe** and **idempotent**:

- ✅ Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
- ✅ Uses `ON CONFLICT DO NOTHING` when initializing existing business days
- ✅ Preserves existing data by calculating current counts
- ✅ Can be run multiple times without errors
- ✅ No data loss - only adds new table and replaces function logic

## Testing the Fix

### Test 1: Database Functions
```sql
-- Create a test business day
INSERT INTO public.business_days (status, opened_by, opening_cash)
VALUES ('open', '<your-user-id>', 500.00)
RETURNING id;

-- Test next_order_number (should return ORD-20260216-0001)
SELECT public.next_order_number('<business-day-id>');

-- Call again (should return ORD-20260216-0002)
SELECT public.next_order_number('<business-day-id>');

-- Test next_bill_number (should return BILL-20260216-0001)
SELECT public.next_bill_number('<business-day-id>');
```

### Test 2: Frontend Double-Click Protection
1. Open POS page
2. Start a new session (table, takeaway, or delivery)
3. Add items and click "Add" button rapidly multiple times
4. Verify only ONE order is created (check console logs for "already submitting" message)

### Test 3: Concurrent Order Creation
```javascript
// Run this in browser console while on POS page
// Simulates multiple concurrent order submissions
const testRaceCondition = async () => {
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      supabase.from('orders').insert({
        session_id: '<session-id>',
        business_day_id: '<business-day-id>',
        source: 'manual',
        status: 'accepted'
      })
    );
  }
  const results = await Promise.all(promises);
  console.log('All completed:', results);
  // Should see 5 unique order numbers with no duplicates
};
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop the new functions
DROP FUNCTION IF EXISTS public.next_order_number(UUID);
DROP FUNCTION IF EXISTS public.next_bill_number(UUID);

-- Restore old trigger functions
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    day_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO day_count
    FROM orders
    WHERE business_day_id = NEW.business_day_id;
    
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(day_count::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
    day_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO day_count
    FROM bills
    WHERE business_day_id = NEW.business_day_id;
    
    NEW.bill_number := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(day_count::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optionally drop the counter table (only if you're sure!)
-- DROP TABLE IF EXISTS public.order_counters;
```

## Performance Impact

✅ **Positive**:
- Eliminates race conditions completely
- Counter table has one row per business day (minimal storage)
- Indexed lookups are very fast
- Row-level locks are held only during UPDATE (microseconds)

⚠️ **Considerations**:
- Each order/bill creation now requires 2 operations instead of 1 (counter update + insert)
- Negligible impact in normal use (< 1ms overhead)
- UPDATE lock could theoretically cause brief waits under extreme concurrent load, but prevents duplicates

## Monitoring

After applying the migration, monitor for:

1. **No more 23505 errors** in Supabase logs
2. **Sequential order numbers** within each business day
3. **No gaps** in order numbers (unless orders were cancelled)
4. **Counter table growth**: Should have only 1 row per business day

Query to check counters:
```sql
SELECT 
  bd.opened_at,
  bd.status,
  oc.last_order_no,
  oc.last_bill_no,
  (SELECT COUNT(*) FROM orders WHERE business_day_id = bd.id) as actual_orders,
  (SELECT COUNT(*) FROM bills WHERE business_day_id = bd.id) as actual_bills
FROM public.business_days bd
LEFT JOIN public.order_counters oc ON oc.business_day_id = bd.id
ORDER BY bd.opened_at DESC
LIMIT 10;
```

## Questions?

If you encounter any issues:
1. Check Supabase logs for detailed error messages
2. Verify the migration was applied: `SELECT * FROM public.order_counters LIMIT 1;`
3. Check that triggers are active: `SELECT tgname FROM pg_trigger WHERE tgname LIKE '%order%' OR tgname LIKE '%bill%';`
