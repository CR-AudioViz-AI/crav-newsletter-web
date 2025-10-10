-- RLS Rollback Script
-- Use this ONLY in emergencies to disable RLS temporarily
-- WARNING: This removes all security! Re-enable RLS ASAP after fixing issues

-- =============================================================================
-- STEP 1: Disable RLS on all tables
-- =============================================================================

ALTER TABLE IF EXISTS segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sends DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS unsubscribes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_bus DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS idempotency_keys DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: Drop all policies (optional, for clean slate)
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname
              FROM pg_policies
              WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =============================================================================
-- STEP 3: Verification
-- =============================================================================

SELECT 'RLS disabled on all tables' as status;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('segments', 'subscribers', 'campaigns', 'sends', 'email_events')
ORDER BY tablename;

-- Expected: rowsecurity = false for all tables

-- =============================================================================
-- CRITICAL: RE-ENABLE RLS IMMEDIATELY AFTER FIXING ISSUES
-- Run prod_rls_policies.sql to restore security
-- =============================================================================
