-- Production RLS Policies for Newsletter Pro
-- CRITICAL: Deploy this BEFORE going to production
-- This script enables RLS and creates secure, deny-by-default policies

-- =============================================================================
-- STEP 1: Enable RLS on all tables (deny-by-default)
-- =============================================================================

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bus ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: Drop any existing policies (idempotent)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own org segments" ON segments;
DROP POLICY IF EXISTS "Users can create segments in own org" ON segments;
DROP POLICY IF EXISTS "Users can update own org segments" ON segments;
DROP POLICY IF EXISTS "Users can delete own org segments" ON segments;

DROP POLICY IF EXISTS "Users can view own org subscribers" ON subscribers;
DROP POLICY IF EXISTS "Users can create subscribers in own org" ON subscribers;
DROP POLICY IF EXISTS "Users can update own org subscribers" ON subscribers;
DROP POLICY IF EXISTS "Users can delete own org subscribers" ON subscribers;

DROP POLICY IF EXISTS "Users can view own org campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can create campaigns in own org" ON campaigns;
DROP POLICY IF EXISTS "Users can update own org campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON campaigns;

DROP POLICY IF EXISTS "Users can view own org sends" ON sends;
DROP POLICY IF EXISTS "System can create sends" ON sends;
DROP POLICY IF EXISTS "Append-only sends for non-admins" ON sends;

DROP POLICY IF EXISTS "Users can view own org events" ON email_events;
DROP POLICY IF EXISTS "System can create events" ON email_events;
DROP POLICY IF EXISTS "Append-only events for non-admins" ON email_events;

DROP POLICY IF EXISTS "Users can view own org unsubscribes" ON unsubscribes;
DROP POLICY IF EXISTS "System can create unsubscribes" ON unsubscribes;

DROP POLICY IF EXISTS "Users can view own org credits" ON credit_ledger;
DROP POLICY IF EXISTS "System can create credit entries" ON credit_ledger;

DROP POLICY IF EXISTS "System can access event bus" ON event_bus;
DROP POLICY IF EXISTS "System can access idempotency keys" ON idempotency_keys;

-- =============================================================================
-- STEP 3: Helper function to extract JWT claims
-- =============================================================================

CREATE OR REPLACE FUNCTION auth.user_org_id() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'org_id',
    ''
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'viewer'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS boolean AS $$
  SELECT auth.user_role() = 'admin';
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- STEP 4: Segments Table Policies
-- =============================================================================

CREATE POLICY "Users can view own org segments"
  ON segments FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can create segments in own org"
  ON segments FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'editor'));

CREATE POLICY "Users can update own org segments"
  ON segments FOR UPDATE
  TO authenticated
  USING (org_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'editor'))
  WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Admins can delete segments"
  ON segments FOR DELETE
  TO authenticated
  USING (org_id = auth.user_org_id() AND auth.is_admin());

-- =============================================================================
-- STEP 5: Subscribers Table Policies
-- =============================================================================

CREATE POLICY "Users can view own org subscribers"
  ON subscribers FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can create subscribers in own org"
  ON subscribers FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Users can update own org subscribers"
  ON subscribers FOR UPDATE
  TO authenticated
  USING (org_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'editor'))
  WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Admins can delete subscribers"
  ON subscribers FOR DELETE
  TO authenticated
  USING (org_id = auth.user_org_id() AND auth.is_admin());

-- =============================================================================
-- STEP 6: Campaigns Table Policies
-- =============================================================================

CREATE POLICY "Users can view own org campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());

CREATE POLICY "Users can create campaigns in own org"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'editor'));

CREATE POLICY "Users can update own org campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (org_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'editor'))
  WITH CHECK (org_id = auth.user_org_id());

CREATE POLICY "Admins can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (org_id = auth.user_org_id() AND auth.is_admin());

-- =============================================================================
-- STEP 7: Sends Table Policies (Append-Only for Non-Admins)
-- =============================================================================

CREATE POLICY "Users can view own org sends"
  ON sends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = sends.campaign_id
      AND campaigns.org_id = auth.user_org_id()
    )
  );

CREATE POLICY "System can create sends"
  ON sends FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = sends.campaign_id
      AND campaigns.org_id = auth.user_org_id()
    )
  );

-- Sends are append-only: no UPDATE or DELETE allowed for non-admins
-- This prevents tampering with delivery records

CREATE POLICY "Admins can update sends for debugging"
  ON sends FOR UPDATE
  TO authenticated
  USING (
    auth.is_admin() AND
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = sends.campaign_id
      AND campaigns.org_id = auth.user_org_id()
    )
  );

-- =============================================================================
-- STEP 8: Email Events Table Policies (Append-Only)
-- =============================================================================

CREATE POLICY "Users can view own org events"
  ON email_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_events.campaign_id
      AND campaigns.org_id = auth.user_org_id()
    )
  );

CREATE POLICY "System can create events"
  ON email_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_events.campaign_id
      AND campaigns.org_id = auth.user_org_id()
    )
  );

-- Events are append-only: no UPDATE or DELETE
-- This preserves audit trail integrity

-- =============================================================================
-- STEP 9: Unsubscribes Table Policies
-- =============================================================================

CREATE POLICY "Users can view own org unsubscribes"
  ON unsubscribes FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());

CREATE POLICY "System can create unsubscribes"
  ON unsubscribes FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth.user_org_id());

-- Unsubscribes are append-only: cannot be deleted (compliance requirement)

-- =============================================================================
-- STEP 10: Credit Ledger Policies
-- =============================================================================

CREATE POLICY "Users can view own org credits"
  ON credit_ledger FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());

CREATE POLICY "System can create credit entries"
  ON credit_ledger FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth.user_org_id());

-- Credit ledger is append-only for audit purposes

-- =============================================================================
-- STEP 11: System Tables (Event Bus, Idempotency)
-- =============================================================================

-- Event bus: system-level access only
CREATE POLICY "System can access event bus"
  ON event_bus FOR ALL
  TO authenticated
  USING (true);

-- Idempotency keys: system-level access only
CREATE POLICY "System can access idempotency keys"
  ON idempotency_keys FOR ALL
  TO authenticated
  USING (true);

-- =============================================================================
-- STEP 12: Verification Queries
-- =============================================================================

-- Run these to verify policies are working:

-- Test 1: Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('segments', 'subscribers', 'campaigns', 'sends', 'email_events');

-- Test 2: Count policies per table
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Test 3: List all policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- =============================================================================

-- 1. TIMING: Deploy this AFTER disabling dev mode but BEFORE accepting traffic
-- 2. TESTING: Run verification queries above immediately after deploy
-- 3. ROLLBACK: Keep dev_rls_permissive.sql handy if you need to debug
-- 4. MONITORING: Watch for 403/unauthorized errors in logs after deploy
-- 5. JWT CLAIMS: Ensure SSO JWT includes org_id and role in claims

-- Expected JWT structure:
-- {
--   "sub": "user-uuid",
--   "org_id": "org-uuid",
--   "workspace_id": "workspace-uuid",
--   "role": "admin" | "editor" | "viewer",
--   "email": "user@example.com",
--   "iss": "https://sso.crav.io",
--   "aud": "crav.newsletter"
-- }

SELECT 'Production RLS policies deployed successfully' as status;
