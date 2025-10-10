# Newsletter Pro - Deployment Runbook

## Overview

This runbook covers the deployment process for Newsletter Pro from development to staging to production.

---

## Pre-Deployment Checklist

### For Staging Deploy

- [ ] All tests passing in CI
- [ ] Code reviewed and approved
- [ ] Database migrations tested locally
- [ ] Environment variables prepared in `.env.staging`
- [ ] Staging Supabase project created
- [ ] DNS records for staging subdomain configured

### For Production Deploy

- [ ] All staging acceptance tests passed
- [ ] Load testing completed (1000 sends/min sustained)
- [ ] Security audit completed
- [ ] DKIM/SPF/DMARC verified in production domain
- [ ] SES moved out of sandbox
- [ ] On-call engineer identified
- [ ] Rollback plan reviewed
- [ ] Change ticket approved

---

## Staging Deployment

### 1. Prepare Environment

```bash
# Set staging environment variables
export ENV=staging
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export DATABASE_URL="postgresql://..."
export APP_MODE="prod"
export AUTH_MODE="sso"
export CRAV_SSO_ISSUER="https://sso.crav.io"
export CRAV_SSO_JWKS_URL="https://sso.crav.io/.well-known/jwks.json"
export CREDITS_API_URL="https://credits-api-staging.crav.io"
export CREDITS_API_KEY="staging-key"
export AWS_SES_REGION="us-west-2"
export AWS_SES_ACCESS_KEY_ID="AKIA..."
export AWS_SES_SECRET_ACCESS_KEY="..."
```

### 2. Deploy Database Migrations

```bash
# Connect to staging database
psql $DATABASE_URL

# Run production RLS policies
\i sql/prod_rls_policies.sql

# Verify policies are enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

# Should show rowsecurity = true for all tables
```

### 3. Build Application

```bash
cd apps/newsletter-pro

# Install dependencies
npm ci

# Run tests
npm run test

# Typecheck
npm run typecheck

# Build production bundle
npm run build

# Verify build succeeded
ls -la .next/
```

### 4. Deploy Application

**Option A: Vercel/Netlify**
```bash
# Deploy to staging
vercel --prod --env staging
# or
netlify deploy --prod --alias staging
```

**Option B: Docker + AWS ECS**
```bash
# Build Docker image
docker build -t newsletter-pro:staging .

# Tag and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag newsletter-pro:staging $ECR_REGISTRY/newsletter-pro:staging
docker push $ECR_REGISTRY/newsletter-pro:staging

# Update ECS service
aws ecs update-service \
  --cluster newsletter-staging \
  --service newsletter-pro \
  --force-new-deployment
```

**Option C: Direct VM Deploy**
```bash
# SSH to staging server
ssh ubuntu@newsletter-staging.crav.io

# Pull latest code
cd /var/www/newsletter-pro
git pull origin main

# Install deps and build
npm ci
npm run build

# Restart service
sudo systemctl restart newsletter-pro
```

### 5. Verify Deployment

```bash
# Check health endpoint
curl https://newsletter-staging.crav.io/api/health
# Expected: {"status":"ok","database":"connected","timestamp":"2025-..."}

# Check metrics
curl https://newsletter-staging.crav.io/api/metrics

# Test authentication
curl -H "Authorization: Bearer $STAGING_JWT" \
  https://newsletter-staging.crav.io/api/trpc/campaigns.list

# Verify logs are flowing
# CloudWatch / Datadog / wherever logs go
```

### 6. Run Smoke Tests

```bash
# Run e2e test suite
npm run test:e2e:staging

# Manual smoke test
# 1. Login to staging UI
# 2. Import CSV
# 3. Create campaign
# 4. Schedule campaign
# 5. Verify events in database
```

---

## Production Deployment

### 1. Create Release Tag

```bash
# Tag the release
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# Verify tag
git describe --tags
```

### 2. Deploy Database (Production)

```bash
# Connect to production database (use read-only first to verify)
psql $PROD_DATABASE_URL_READONLY

# Verify current state
SELECT COUNT(*) FROM campaigns;
SELECT COUNT(*) FROM subscribers;

# Disconnect read-only, connect with write access
psql $PROD_DATABASE_URL

# Deploy RLS policies
\i sql/prod_rls_policies.sql

# Verify
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

### 3. Deploy Application (Production)

**Follow same process as staging but with production credentials**

```bash
# Set production environment
export ENV=production
export SUPABASE_URL="https://prod-project.supabase.co"
# ... other prod vars

# Build
npm ci
npm run build

# Deploy
vercel --prod --env production
# or equivalent for your hosting platform
```

### 4. Smoke Test Production

```bash
# Health check
curl https://newsletter.crav.io/api/health

# Send test campaign to internal test list
# Use production UI to schedule a small test campaign
```

### 5. Monitor Deployment

```bash
# Watch logs for errors
tail -f /var/log/newsletter-pro/app.log
# or CloudWatch Logs Insights

# Watch metrics
# Check Grafana dashboard for:
# - Error rate
# - Response times
# - Database connections
# - Email send rate

# Set up alerts
# Ensure PagerDuty/OpsGenie is configured
```

---

## Rollback Procedure

### If Issues Detected in Production

**Option 1: Revert Git Commit**
```bash
# Revert to previous working version
git revert v1.0.0
git push origin main

# Re-deploy
npm run deploy:production
```

**Option 2: Rollback Infrastructure**
```bash
# Vercel: rollback to previous deployment
vercel rollback

# ECS: rollback to previous task definition
aws ecs update-service \
  --cluster newsletter-prod \
  --service newsletter-pro \
  --task-definition newsletter-pro:42  # previous version

# VM: checkout previous tag
git checkout v0.9.9
npm ci
npm run build
sudo systemctl restart newsletter-pro
```

**Option 3: Database Rollback (DANGEROUS)**
```bash
# Only if RLS policies broke something
# Re-run dev_rls_permissive.sql TEMPORARILY
psql $PROD_DATABASE_URL < sql/dev_rls_permissive.sql

# Fix issues, then re-apply prod policies
psql $PROD_DATABASE_URL < sql/prod_rls_policies.sql
```

### Post-Rollback

1. Verify services are healthy
2. Notify stakeholders
3. Create post-mortem document
4. Schedule incident review meeting

---

## Database Migration Best Practices

### Creating a Migration

```bash
# Create new migration file
touch sql/migrations/$(date +%Y%m%d%H%M%S)_add_new_feature.sql
```

### Migration Template

```sql
-- Migration: Add new feature
-- Author: Your Name
-- Date: 2025-10-10

BEGIN;

-- Add new column
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS new_field text;

-- Create index
CREATE INDEX IF NOT EXISTS idx_campaigns_new_field ON campaigns(new_field);

-- Update RLS policy if needed
DROP POLICY IF EXISTS "Users can view campaigns" ON campaigns;
CREATE POLICY "Users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (org_id = auth.user_org_id());

COMMIT;

-- Verification
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'campaigns' AND column_name = 'new_field';
```

### Running Migrations

```bash
# Always test in staging first
psql $STAGING_DATABASE_URL < sql/migrations/20251010120000_add_new_feature.sql

# Verify in staging
psql $STAGING_DATABASE_URL -c "SELECT * FROM campaigns LIMIT 1;"

# Then production (during maintenance window)
psql $PROD_DATABASE_URL < sql/migrations/20251010120000_add_new_feature.sql
```

---

## Troubleshooting Common Issues

### Issue: 403 Forbidden after RLS Deploy

**Symptom:** Users getting 403 errors when accessing campaigns

**Diagnosis:**
```bash
# Check RLS policies
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename = 'campaigns';"

# Check JWT claims
# Add logging to see what org_id is in JWT
```

**Fix:**
- Verify JWT includes `org_id` claim
- Check policy USING clause matches JWT structure
- Temporarily disable RLS to isolate issue

### Issue: Webhook 500 Errors

**Symptom:** `/api/provider/webhook` returning 500

**Diagnosis:**
```bash
# Check logs
grep "webhook" /var/log/newsletter-pro/app.log | tail -50

# Test webhook locally
curl -X POST http://localhost:3000/api/provider/webhook \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json
```

**Fix:**
- Verify SNS signature validation is working
- Check idempotency key handling
- Ensure database connection is healthy

### Issue: Credits API Timeout

**Symptom:** Campaigns stuck in "pending" status

**Diagnosis:**
```bash
# Check Credits API health
curl https://credits-api.crav.io/health

# Check credit_ledger table
psql $DATABASE_URL -c "SELECT * FROM credit_ledger ORDER BY created_at DESC LIMIT 10;"
```

**Fix:**
- Retry failed credit authorize calls
- Check API key is valid
- Implement circuit breaker pattern

---

## Emergency Contacts

**On-Call Engineer:** Check PagerDuty schedule
**Database Admin:** dba-team@crav.io
**Platform Team:** platform-team@crav.io
**Security Team:** security@crav.io

---

## Post-Deployment Tasks

- [ ] Update CHANGELOG.md
- [ ] Update deployment tracker spreadsheet
- [ ] Notify #engineering Slack channel
- [ ] Monitor for 24 hours
- [ ] Schedule post-deployment review (if major release)
- [ ] Update documentation if new features deployed

---

## Useful Commands

```bash
# Check running processes
ps aux | grep newsletter

# Check disk space
df -h

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check logs
tail -f /var/log/newsletter-pro/*.log

# Restart service
sudo systemctl restart newsletter-pro

# Check service status
sudo systemctl status newsletter-pro
```
