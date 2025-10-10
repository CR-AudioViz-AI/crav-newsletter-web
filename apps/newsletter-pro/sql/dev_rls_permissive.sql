-- DEV ONLY: Disable RLS on core tables for local development
-- This allows seed scripts and UI to work without service-role key
-- WARNING: DO NOT run this in production! Roll back or replace with proper policies.

-- Core tables used by the application
ALTER TABLE IF EXISTS segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sends DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS unsubscribes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_bus DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS idempotency_keys DISABLE ROW LEVEL SECURITY;

-- Log the change
SELECT 'RLS disabled for dev mode on all core tables' as status;
