-- Migration: Fix order_number/bill_number race condition
-- Date: 2026-02-16
-- Description: Replace COUNT(*)+1 pattern with atomic counter table to prevent duplicate key violations

-- =====================================================================
-- STEP 1: Create order_counters table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.order_counters (
    business_day_id UUID PRIMARY KEY REFERENCES public.business_days(id) ON DELETE CASCADE,
    last_order_no INTEGER NOT NULL DEFAULT 0,
    last_bill_no INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_counters_business_day 
ON public.order_counters(business_day_id);

-- Enable RLS on order_counters
ALTER TABLE public.order_counters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for order_counters
CREATE POLICY "Allow authenticated users to read order_counters"
ON public.order_counters FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert order_counters"
ON public.order_counters FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update order_counters"
ON public.order_counters FOR UPDATE
TO authenticated
USING (true);

-- =====================================================================
-- STEP 2: Initialize counters for existing business days
-- =====================================================================
-- Populate order_counters for existing business days based on current max numbers
INSERT INTO public.order_counters (business_day_id, last_order_no, last_bill_no)
SELECT 
    bd.id,
    COALESCE((
        SELECT COUNT(*) 
        FROM public.orders 
        WHERE business_day_id = bd.id
    ), 0) AS last_order_no,
    COALESCE((
        SELECT COUNT(*) 
        FROM public.bills 
        WHERE business_day_id = bd.id
    ), 0) AS last_bill_no
FROM public.business_days bd
ON CONFLICT (business_day_id) DO NOTHING;

-- =====================================================================
-- STEP 3: Create atomic counter functions with row-level locking
-- =====================================================================

-- Function to get next order number atomically
CREATE OR REPLACE FUNCTION public.next_order_number(p_business_day_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_next_no INTEGER;
    v_order_number TEXT;
BEGIN
    -- Ensure counter row exists, create if not
    INSERT INTO public.order_counters (business_day_id, last_order_no, last_bill_no)
    VALUES (p_business_day_id, 0, 0)
    ON CONFLICT (business_day_id) DO NOTHING;
    
    -- Atomically increment and return the counter with row lock
    UPDATE public.order_counters
    SET last_order_no = last_order_no + 1,
        updated_at = NOW()
    WHERE business_day_id = p_business_day_id
    RETURNING last_order_no INTO v_next_no;
    
    -- Format order number: ORD-YYYYMMDD-0001
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_next_no::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get next bill number atomically
CREATE OR REPLACE FUNCTION public.next_bill_number(p_business_day_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_next_no INTEGER;
    v_bill_number TEXT;
BEGIN
    -- Ensure counter row exists, create if not
    INSERT INTO public.order_counters (business_day_id, last_order_no, last_bill_no)
    VALUES (p_business_day_id, 0, 0)
    ON CONFLICT (business_day_id) DO NOTHING;
    
    -- Atomically increment and return the counter with row lock
    UPDATE public.order_counters
    SET last_bill_no = last_bill_no + 1,
        updated_at = NOW()
    WHERE business_day_id = p_business_day_id
    RETURNING last_bill_no INTO v_next_no;
    
    -- Format bill number: BILL-YYYYMMDD-0001
    v_bill_number := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_next_no::TEXT, 4, '0');
    
    RETURN v_bill_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- STEP 4: Update trigger functions to use atomic counters
-- =====================================================================

-- Replace generate_order_number trigger function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Use atomic counter function instead of COUNT(*) + 1
    NEW.order_number := public.next_order_number(NEW.business_day_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace generate_bill_number trigger function
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Use atomic counter function instead of COUNT(*) + 1
    NEW.bill_number := public.next_bill_number(NEW.business_day_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- STEP 5: Verify triggers still exist (they should from initial schema)
-- =====================================================================
-- The triggers should already exist from complete_schema.sql:
-- CREATE TRIGGER trigger_generate_order_number BEFORE INSERT ON orders FOR EACH ROW WHEN (NEW.order_number IS NULL) EXECUTE FUNCTION generate_order_number();
-- CREATE TRIGGER trigger_generate_bill_number BEFORE INSERT ON bills FOR EACH ROW WHEN (NEW.bill_number IS NULL) EXECUTE FUNCTION generate_bill_number();

-- If for some reason they don't exist, create them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_order_number'
    ) THEN
        CREATE TRIGGER trigger_generate_order_number 
        BEFORE INSERT ON orders 
        FOR EACH ROW 
        WHEN (NEW.order_number IS NULL) 
        EXECUTE FUNCTION generate_order_number();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_bill_number'
    ) THEN
        CREATE TRIGGER trigger_generate_bill_number 
        BEFORE INSERT ON bills 
        FOR EACH ROW 
        WHEN (NEW.bill_number IS NULL) 
        EXECUTE FUNCTION generate_bill_number();
    END IF;
END $$;

-- =====================================================================
-- Migration complete
-- =====================================================================
-- The order_number and bill_number generation is now atomic and safe from race conditions.
-- Each business_day_id maintains its own counter that is incremented atomically using UPDATE with row lock.
